import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useHelpRequests } from './useHelpRequests';
import type { ContactMethod, ProfileListItem } from '../types/api';

export interface ConnectionRow {
  helpRequestId: number;
  peerProfileId: number;
  peer: ProfileListItem | null;
  topic: string;
  relatedSkillLabel: string;
  acceptedAt: string;
  preferredContactMethod: string;
  contactMethods: ContactMethod[];
}

export function useConnections() {
  const auth = useAuth();
  const helpQuery = useHelpRequests();

  const connections = useMemo((): ConnectionRow[] => {
    if (helpQuery.data?.isMock || !helpQuery.data?.raw.length) return [];
    const myId = auth.user?.id;
    if (!myId) return [];

    return helpQuery.data.raw
      .filter((r) => r.status === 'accepted')
      .map((r) => {
        const imSeeker = r.seeker === myId;
        const peerProfileId = imSeeker ? r.helper_profile : r.seeker_profile_id ?? 0;
        const peerDetail = imSeeker ? r.helper_profile_detail ?? null : r.seeker_profile_detail ?? null;
        const contactMethods = imSeeker ? r.helper_contact_methods ?? [] : r.seeker_contact_methods ?? [];
        return {
          helpRequestId: r.id,
          peerProfileId,
          peer: peerDetail,
          topic: r.topic,
          relatedSkillLabel: r.related_skill_name || (r.related_skill ? `Skill #${r.related_skill}` : 'General'),
          acceptedAt: r.accepted_at || r.updated_at || r.created_at,
          preferredContactMethod: r.preferred_contact_method || 'email',
          contactMethods,
        };
      })
      .filter((row) => Boolean(row.peerProfileId));
  }, [auth.user?.id, helpQuery.data]);

  return { connections, isLoading: helpQuery.isLoading, isError: helpQuery.isError };
}
