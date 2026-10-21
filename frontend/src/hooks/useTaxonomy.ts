import { useQuery } from '@tanstack/react-query';
import { getSkillCategories, getSkills } from '../lib/taxonomyApi';

export function useTaxonomy() {
  return useQuery({
    queryKey: ['taxonomy'],
    queryFn: async () => {
      const [categories, skills] = await Promise.all([getSkillCategories(), getSkills()]);
      return {
        categories: categories.map((category) => category.name),
        skills: skills.map((skill) => skill.name),
        rawCategories: categories,
        rawSkills: skills,
      };
    },
    retry: 1,
  });
}
