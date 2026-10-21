import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {ProtectedRoute} from './ProtectedRoute';
const state=vi.hoisted(()=>({auth:{isAuthenticated:true,hasCompletedOnboarding:true},status:{isLoading:false,data:{has_completed_onboarding:true}}}));
vi.mock('../../hooks/useAuth',()=>({useAuth:()=>state.auth}));
vi.mock('../../hooks/useBootstrap',()=>({useOnboardingStatus:()=>state.status}));
function view(path='/discover'){render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<ProtectedRoute/>}><Route path="/discover" element={<p>Private discovery</p>}/><Route path="/home" element={<p>Home page</p>}/><Route path="/welcome" element={<p>Set up your profile</p>}/><Route path="/welcome/matches" element={<p>Your first matches</p>}/></Route><Route path="/login" element={<p>Sign in first</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{state.auth.isAuthenticated=true;state.status.isLoading=false;state.status.data.has_completed_onboarding=true;});afterEach(cleanup);
it('redirects anonymous visitors before showing private discovery',()=>{state.auth.isAuthenticated=false;view();expect(screen.getByText('Sign in first')).toBeTruthy();expect(screen.queryByText('Private discovery')).toBeNull();});
it('waits for account setup status',()=>{state.status.isLoading=true;view();expect(screen.getByText('Loading your Illini SkillShare profile...')).toBeTruthy();});
it('sends incomplete accounts to setup',()=>{state.status.data.has_completed_onboarding=false;view();expect(screen.getByText('Set up your profile')).toBeTruthy();});
it('keeps incomplete accounts inside setup',()=>{state.status.data.has_completed_onboarding=false;view('/welcome');expect(screen.getByText('Set up your profile')).toBeTruthy();});
it('lets a set-up account reach private discovery',()=>{view();expect(screen.getByText('Private discovery')).toBeTruthy();});
it('sends set-up accounts from setup to home but still shows first matches',()=>{view('/welcome');expect(screen.getByText('Home page')).toBeTruthy();cleanup();view('/welcome/matches');expect(screen.getByText('Your first matches')).toBeTruthy();});
