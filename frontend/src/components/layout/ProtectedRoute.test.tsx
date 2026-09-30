import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {ProtectedRoute} from './ProtectedRoute';
const state=vi.hoisted(()=>({auth:{isAuthenticated:true,isDemo:false,hasCompletedOnboarding:true},status:{isLoading:false,data:{has_completed_onboarding:true}}}));
vi.mock('../../hooks/useAuth',()=>({useAuth:()=>state.auth}));
vi.mock('../../hooks/useBootstrap',()=>({useOnboardingStatus:()=>state.status}));
vi.mock('../../lib/api',()=>({shouldUseMocks:()=>false}));
function view(){render(<MemoryRouter initialEntries={['/discover']}><Routes><Route element={<ProtectedRoute/>}><Route path="/discover" element={<p>Private discovery</p>}/></Route><Route path="/login" element={<p>Sign in first</p>}/><Route path="/onboarding" element={<p>Build your profile</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{state.auth.isAuthenticated=true;state.status.isLoading=false;state.status.data.has_completed_onboarding=true;});afterEach(cleanup);
it('redirects anonymous visitors before showing private discovery',()=>{state.auth.isAuthenticated=false;view();expect(screen.getByText('Sign in first')).toBeTruthy();expect(screen.queryByText('Private discovery')).toBeNull();});
it('waits for account onboarding status',()=>{state.status.isLoading=true;view();expect(screen.getByText('Loading your Illini SkillSwap profile...')).toBeTruthy();});
it('requires incomplete accounts to finish onboarding',()=>{state.status.data.has_completed_onboarding=false;view();expect(screen.getByText('Build your profile')).toBeTruthy();});
it('lets an onboarded account reach private discovery',()=>{view();expect(screen.getByText('Private discovery')).toBeTruthy();});
