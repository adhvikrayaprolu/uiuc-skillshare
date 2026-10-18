import {expect,it} from 'vitest';
import {defaultProfileForm,validateProfileForm,validateSetupStep} from './profilePersistence';

const complete = () => ({...defaultProfileForm('student@illinois.edu'), displayName: 'Sam', major: 'CS', year: 'junior' as const, headline: 'Python tutor', selectedSkillIds: [1], learningGoalIds: [2], availability: [{day_of_week: 'monday', time_block: 'evening'}]});

it('flags each missing basics field on the first step', () => {
  expect(Object.keys(validateSetupStep(defaultProfileForm(), 'about'))).toEqual(['displayName', 'major', 'year', 'headline']);
});
it('requires a teaching skill and a learning goal on their own steps', () => {
  const form = {...complete(), selectedSkillIds: [], learningGoalIds: []};
  expect(validateSetupStep(form, 'teach').skills).toBeTruthy();
  expect(validateSetupStep(form, 'learn').goals).toBeTruthy();
});
it('accepts a note instead of grid availability and needs a contact when sharing', () => {
  const form = {...complete(), availability: [], availabilityNotes: 'Weekends', contacts: []};
  expect(validateSetupStep(form, 'availability')).toEqual({contact: 'Add a contact method to share after you accept a request.'});
  expect(validateSetupStep({...form, shareContacts: false}, 'availability')).toEqual({});
});
it('treats bio as optional for a complete profile', () => {
  expect(validateProfileForm(complete())).toEqual([]);
  expect(validateProfileForm({...complete(), learningGoalIds: []})).toContain('Add at least one skill you want to learn.');
});
