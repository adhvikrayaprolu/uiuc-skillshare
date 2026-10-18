import {beforeEach,expect,it} from 'vitest';
import {startDemoSession,clearAuth,isDemoSession,getDemoUser,authStorageKeys} from './auth';
import {shouldUseMocks} from './api';
beforeEach(()=>{localStorage.clear();});
it('uses mock data for an explicit demo session',()=>{startDemoSession();expect(shouldUseMocks()).toBe(true);});
it('does not mix stale demo data into an API session',()=>{startDemoSession();clearAuth();expect(isDemoSession()).toBe(false);expect(shouldUseMocks()).toBe(false);});
it('clears both provider tokens and demo identity on logout',()=>{startDemoSession();localStorage.setItem(authStorageKeys.access,'legacy-access');localStorage.setItem(authStorageKeys.refresh,'legacy-refresh');clearAuth();expect(localStorage.length).toBe(0);});
it('recovers from corrupt demo state',()=>{localStorage.setItem(authStorageKeys.demoUser,'broken-json');expect(getDemoUser()).toBeNull();expect(localStorage.getItem(authStorageKeys.demoUser)).toBeNull();});
