import {beforeEach,expect,it,vi} from 'vitest';
import {defaultProfileForm,saveProfileForm} from './profilePersistence';
import {api} from './api';
vi.mock('./api',()=>({api:{put:vi.fn()}}));
beforeEach(()=>vi.resetAllMocks());
it('submits one complete profile request rather than destructive client-side replacements',async()=>{
 const form=defaultProfileForm('student@illinois.edu');form.displayName=' Student ';form.headline='Help';form.bio='Bio';
 vi.mocked(api.put).mockResolvedValue({data:{id:1}});
 expect(await saveProfileForm(form)).toEqual({id:1});expect(api.put).toHaveBeenCalledTimes(1);
 expect(api.put).toHaveBeenCalledWith('/profiles/me/aggregate/',expect.objectContaining({profile:expect.objectContaining({display_name:'Student'}),contacts:[expect.objectContaining({type:'email',value:'student@illinois.edu',is_public:true})],skills:[],credentials:[]}));
});
it('propagates a failed save so the editor can keep its form and show recovery feedback',async()=>{
 vi.mocked(api.put).mockRejectedValue(new Error('Network unavailable'));
 await expect(saveProfileForm(defaultProfileForm())).rejects.toThrow('Network unavailable');expect(api.put).toHaveBeenCalledTimes(1);
});
