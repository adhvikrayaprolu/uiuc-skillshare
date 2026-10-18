import hashlib
from django.core.cache import cache
from django.db import connection
from django.db.models import F
from pgvector.django import CosineDistance
from . import ai
from .models import ProfileSearchIndex


def semantic_candidates(queryset, query):
    reason = ai.disabled_reason()
    if reason:
        return {}, reason
    if connection.vendor != 'postgresql':
        return {}, 'postgresql_required'
    try:
        key = 'semantic-query:' + hashlib.sha256(f'{ai.MODEL}:{ai.VERSION}:{query}'.encode()).hexdigest()
        vector = cache.get(key)
        if vector is None:
            vector = ai.get_embedding(query)
            cache.set(key, vector, timeout=300)
        vector = ai.validate_vector(vector)
        indexes = ProfileSearchIndex.objects.filter(
            profile__in=queryset, profile__embedding_consent=True, vector__isnull=False,
            embedding_model=ai.MODEL, embedding_version=ai.VERSION, embedding_hash=F('content_hash'),
        ).exclude(embedding_hash='').annotate(distance=CosineDistance('vector', vector)).filter(distance__lte=.65).order_by('distance', 'profile_id')
        rows = list(indexes.values_list('profile_id', 'distance')[:100])
        return {pk: max(0, min(1, 1-float(distance))) for pk, distance in rows}, None if rows else 'no_semantic_candidates'
    except ai.SemanticUnavailable as error:
        return {}, str(error)
    except Exception:
        return {}, 'semantic_unavailable'
