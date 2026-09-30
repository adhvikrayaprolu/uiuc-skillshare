import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {HelpRequestsPage} from './HelpRequestsPage';
import {mockHelpRequests} from '../data/mockData';
const state=vi.hoisted(()=>({mutateAsync:vi.fn(),success:vi.fn(),error:vi.fn(),loadError:false}));
vi.mock('../hooks/useAuth',()=>({useAuth:()=>({user:{id:1}})}));
vi.mock('../hooks/useProfileEditor',()=>({useCurrentProfile:()=>({data:{id:1}})}));
vi.mock('../components/ui/ToastProvider',()=>({useToast:()=>({success:state.success,error:state.error})}));
vi.mock('../lib/api',()=>({shouldUseMocks:()=>false}));
vi.mock('../hooks/useHelpRequests',()=>({useUpdateHelpRequest:()=>({mutateAsync:state.mutateAsync}),useHelpRequests:()=>({isError:state.loadError,data:{isMock:false,requests:[mockHelpRequests.find(r=>r.status==='Pending')],raw:[{id:mockHelpRequests.find(r=>r.status==='Pending')?.id,helper_profile:1,seeker:2,status:'pending'}]}})}));
beforeEach(()=>{vi.resetAllMocks();state.loadError=false;});afterEach(cleanup);
it('submits acceptance to the backend before showing success',async()=>{
 state.mutateAsync.mockResolvedValue({status:'accepted'});render(<MemoryRouter><HelpRequestsPage/></MemoryRouter>);
 await userEvent.click(screen.getByRole('button',{name:/^Accept$/}));
 expect(state.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({payload:{status:'accepted'}}));await waitFor(()=>expect(state.success).toHaveBeenCalledWith('Request accepted.'));
});
it('keeps the pending request available when acceptance fails',async()=>{
 state.mutateAsync.mockRejectedValue(new Error('Offline'));render(<MemoryRouter><HelpRequestsPage/></MemoryRouter>);
 await userEvent.click(screen.getByRole('button',{name:/^Accept$/}));await waitFor(()=>expect(state.error).toHaveBeenCalledWith('Could not accept request.'));
 expect(state.success).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:/^Accept$/})).toBeTruthy();
});
