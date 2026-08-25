import { useQuery } from '@tanstack/react-query';
import { allSkills, skillCategories } from '../data/mockData';
import { shouldUseMocks } from '../lib/api';
import { getSkillCategories, getSkills } from '../lib/taxonomyApi';

const mockRawSkills = allSkills.map((name, index) => ({
  id: index + 1,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  category: 1,
}));

export function useTaxonomy() {
  return useQuery({
    queryKey: ['taxonomy'],
    queryFn: async () => {
      if (shouldUseMocks()) return { categories: skillCategories, skills: allSkills, rawCategories: [], rawSkills: mockRawSkills, isMock: true };
      const [categories, skills] = await Promise.all([getSkillCategories(), getSkills()]);
      return {
        categories: categories.map((category) => category.name),
        skills: skills.map((skill) => skill.name),
        rawCategories: categories,
        rawSkills: skills,
        isMock: false,
      };
    },
    retry: 1,
  });
}
