"""Opt-in provider boundary; client construction is behind the call-budget gate."""
import math
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from openai import OpenAI

MODEL = 'text-embedding-3-small'
DIMENSIONS = 1536
VERSION = 'published-skills-v1-1536'

class SemanticUnavailable(Exception):
    pass


def disabled_reason():
    if not settings.AI_PAID_CALLS_ENABLED:
        return 'paid_calls_disabled'
    if settings.AI_DAILY_CALL_LIMIT <= 0:
        return 'zero_call_budget'
    if not settings.OPENAI_API_KEY:
        return 'provider_not_configured'
    return None


def validate_vector(vector):
    if len(vector) != DIMENSIONS or not all(math.isfinite(float(v)) for v in vector):
        raise SemanticUnavailable('invalid_provider_vector')
    length = math.sqrt(sum(float(v)**2 for v in vector))
    if not length:
        raise SemanticUnavailable('invalid_provider_vector')
    return [float(v)/length for v in vector]


def get_embedding(text):
    reason = disabled_reason()
    if reason:
        raise SemanticUnavailable(reason)
    if not text.strip() or len(text) > 8000:
        raise SemanticUnavailable('input_limit')
    # Redis-backed atomic call ceiling; provider/account spend limits are also needed.
    key = f'embedding-calls:{timezone.now().date().isoformat()}'
    try:
        cache.add(key, 0, timeout=86400)
        if cache.incr(key) > settings.AI_DAILY_CALL_LIMIT:
            raise SemanticUnavailable('daily_call_limit')
    except SemanticUnavailable:
        raise
    except Exception as error:
        raise SemanticUnavailable('budget_store_unavailable') from error
    try:
        with OpenAI(api_key=settings.OPENAI_API_KEY, timeout=5, max_retries=0) as client:
            response = client.embeddings.create(model=MODEL, input=text, dimensions=DIMENSIONS, encoding_format='float')
            if response.model != MODEL or len(response.data) != 1:
                raise SemanticUnavailable('invalid_provider_model')
            return validate_vector(response.data[0].embedding)
    except SemanticUnavailable:
        raise
    except Exception as error:
        raise SemanticUnavailable('provider_unavailable') from error
