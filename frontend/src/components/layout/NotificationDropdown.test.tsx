import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {NotificationDropdown} from './NotificationDropdown';
afterEach(cleanup);
it('shows an honest empty state by default',()=>{render(<MemoryRouter><NotificationDropdown/></MemoryRouter>);expect(screen.getByText('No notifications yet')).toBeTruthy();expect(screen.queryByText('Maya Johnson')).toBeNull();});
it('does not replace an explicitly empty result with sample activity',()=>{render(<MemoryRouter><NotificationDropdown items={[]} showSamples/></MemoryRouter>);expect(screen.getByText('No notifications yet')).toBeTruthy();expect(screen.queryByText('New help request')).toBeNull();});
it('shows a load error without a false empty-state assertion',()=>{render(<MemoryRouter><NotificationDropdown error/></MemoryRouter>);expect(screen.getByRole('alert')).toBeTruthy();expect(screen.queryByText('No notifications yet')).toBeNull();});
it('lets the user navigate from a real request',async()=>{
 render(<MemoryRouter><Routes><Route path="/" element={<NotificationDropdown items={[{id:'1',type:'request',title:'New request',description:'Resume help',href:'/requests',read:false}]}/>}/><Route path="/requests" element={<p>Request inbox</p>}/></Routes></MemoryRouter>);
 expect(screen.getByText('1 new')).toBeTruthy();await userEvent.click(screen.getByRole('link',{name:'Open requests'}));expect(screen.getByText('Request inbox')).toBeTruthy();
});
