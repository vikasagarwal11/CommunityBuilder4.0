/* ------------------------------------------------------------------
      * EventsPage – SmartTagSelector and smart search
      * -----------------------------------------------------------------*/

     import { useState, useEffect } from 'react';
     import { Filter, Search, X, Camera } from 'lucide-react';
     import { supabase } from '../lib/supabase';
     import { useAuth } from '../contexts/AuthContext';
     import { Link, useNavigate } from 'react-router-dom';
     import EventGallery from '../components/events/EventGallery';
     import EventCard, { RSVPStatus } from '../components/events/EventCard';
     import getPersonalisedTags from '../lib/getPersonalisedTags';
     import SmartTagSelector from '../components/events/SmartTagSelector';

     type EventRow = {
       id: string;
       title: string;
       description: string | null;
       start_time: string;
       end_time?: string | null;
       location?: string | null;
       image_url?: string | null;
       capacity?: number | null;
       is_online: boolean;
       meeting_url?: string | null;
       tags?: string[] | null;
       status: string;
       community_id: string;
       created_by: string;
       rsvp_count?: number;
       user_rsvp?: { status: RSVPStatus };
       similarity?: number;
     };

     export default function EventsPage() {
       const { user } = useAuth();
       const navigate = useNavigate();

       const [events, setEvents] = useState<EventRow[]>([]);
       const [pastEvents, setPastEvents] = useState<EventRow[]>([]);
       const [rsvpMap, setRsvpMap] = useState<Record<string, RSVPStatus>>({});
       const [filterTags, setFilterTags] = useState<string[]>([]);
       const [loading, setLoading] = useState(true);
       const [error, setError] = useState('');
       const [registering, setRegistering] = useState(false);
       const [search, setSearch] = useState('');
       const [showFilters, setShowFilters] = useState(false);
       const [tab, setTab] = useState<'upcoming' | 'gallery'>('upcoming');
       const [communityId, setCommunityId] = useState<string | null>(null);
       const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);

       useEffect(() => {
         void fetchData();
       }, [user, search, communityId]);

       async function fetchData() {
         setLoading(true);
         setError('');
         try {
           if (!user) {
             setEvents([]);
             setPastEvents([]);
             setFilterTags(await getPersonalisedTags({ uid: null, communityId: null, upcoming: [], past: [] }));
             return;
           }

           // Fetch user communities
           const { data: communityData, error: communityError } = await supabase
             .from('community_members')
             .select('communities(id, name)')
             .eq('user_id', user.id);
           if (communityError) throw new Error(`Error fetching communities: ${communityError.message}`);
           setCommunities(communityData?.map(c => c.communities) || []);
           if (communityData?.length && !communityId) {
             setCommunityId(communityData[0].communities.id);
           }

           // Fetch upcoming events with semantic search
           const { data: up, error: upError } = await supabase.rpc('search_events_semantically', {
             p_user_id: user.id,
             query: search,
             p_community_id: communityId,
           });
           if (upError) throw new Error(`Error fetching events: ${upError.message}`);

           // Fetch past events
           const { data: past, error: pastError } = await supabase
             .from('community_events')
             .select('*')
             .lt('start_time', new Date().toISOString())
             .order('start_time', { ascending: false })
             .limit(6);
           if (pastError) throw new Error(`Error fetching past events: ${pastError.message}`);

           // Fetch RSVPs
           const map: Record<string, RSVPStatus> = {};
           if (up && past) {
             const { data: my, error: rsvpError } = await supabase
               .from('event_rsvps')
               .select('event_id, status')
               .eq('user_id', user.id)
               .in('event_id', [...up, ...past].map((e) => e.id));
             if (rsvpError) throw new Error(`Error fetching RSVPs: ${rsvpError.message}`);
             my?.forEach((r) => (map[r.event_id] = r.status as RSVPStatus));
           }
           setRsvpMap(map);

           const attach = (arr: EventRow[] | null) =>
             (arr ?? []).map((e) => ({
               ...e,
               user_rsvp: map[e.id] ? { status: map[e.id] } : undefined,
               rsvp_count: e.rsvp_count ?? 0,
             }));

           const upcomingEvents = attach(up);
           const pastEventsAttached = attach(past);
           setEvents(upcomingEvents);
           setPastEvents(pastEventsAttached);

           // Fetch personalized tags
           const tags = await getPersonalisedTags({
             uid: user.id,
             communityId,
             upcoming: upcomingEvents,
             past: pastEventsAttached,
           });
           setFilterTags(tags);
         } catch (e: any) {
           console.error('Fetch error:', e);
           setError(`Failed to load events or tags: ${e.message}`);
         } finally {
           setLoading(false);
         }
       }

       async function handleRSVP(ev: EventRow, status: RSVPStatus) {
         try {
           if (!user) return navigate('/login');
           setRegistering(true);

           const { data: existing, error: existingError } = await supabase
             .from('event_rsvps')
             .select('id')
             .eq('event_id', ev.id)
             .eq('user_id', user.id)
             .maybeSingle();
           if (existingError) throw new Error(`Error checking RSVP: ${existingError.message}`);

           if (existing) {
             const { error: updateError } = await supabase
               .from('event_rsvps')
               .update({ status })
               .eq('id', existing.id);
             if (updateError) throw new Error(`Error updating RSVP: ${updateError.message}`);
           } else {
             const { error: insertError } = await supabase
               .from('event_rsvps')
               .insert({ event_id: ev.id, user_id: user.id, status });
             if (insertError) throw new Error(`Error inserting RSVP: ${insertError.message}`);
           }

           setRsvpMap((m) => ({ ...m, [ev.id]: status }));
           await fetchData();
         } catch (e: any) {
           console.error('RSVP error:', e);
           setError(`Could not update RSVP: ${e.message}`);
         } finally {
           setRegistering(false);
         }
       }

       const visible = events.filter((e) => {
         const q = search.toLowerCase();
         if (!q) return true;
         const matchText =
           e.title.toLowerCase().includes(q) ||
           e.description?.toLowerCase().includes(q) ||
           e.location?.toLowerCase().includes(q);
         const matchTag = e.tags?.some((t) => t.toLowerCase().includes(q));
         return matchText || matchTag;
       });

       if (loading) return <p className="pt-24 text-center">Loading…</p>;

       return (
         <div className="pt-24 pb-16">
           <header className="bg-gradient-to-r from-secondary-500 to-secondary-600 py-16 text-white text-center">
             <h1 className="mb-2">Upcoming events</h1>
             <p className="opacity-90 max-w-2xl mx-auto">
               Discover sessions that fit your schedule and interests.
             </p>
           </header>

           <main className="container my-12">
             <div className="flex flex-col md:flex-row gap-4 mb-4">
               <div className="relative flex-grow max-w-md">
                 <input
                   className="input pl-10 w-full"
                   placeholder="Search events…"
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                 />
                 <Search className="absolute left-3 top-3.5 text-neutral-400" />
                 {search && (
                   <button
                     className="absolute right-3 top-3.5"
                     onClick={() => setSearch('')}
                   >
                     <X size={18} className="text-neutral-400 hover:text-neutral-600" />
                   </button>
                 )}
               </div>
               <select
                 className="input max-w-xs"
                 value={communityId || ''}
                 onChange={(e) => setCommunityId(e.target.value || null)}
               >
                 <option value="">All Communities</option>
                 {communities.map((c) => (
                   <option key={c.id} value={c.id}>
                     {c.name}
                   </option>
                 ))}
               </select>
               <button
                 className="md:hidden flex items-center px-4 py-2 bg-neutral-100 rounded-lg"
                 onClick={() => setShowFilters((s) => !s)}
               >
                 <Filter className="h-4 w-4 mr-2" />
                 {showFilters ? 'Hide' : 'Show'} suggestions
               </button>
             </div>

             {search === '' && (
               <div className={`${showFilters ? 'block' : 'hidden md:block'} mb-8`}>
                 <SmartTagSelector
                   tags={filterTags}
                   onFillSearch={(val) => setSearch(val)}
                 />
               </div>
             )}

             <div className="flex border-b border-neutral-200 mb-8">
               {(['upcoming', 'gallery'] as const).map((t) => (
                 <button
                   key={t}
                   onClick={() => setTab(t)}
                   className={`px-4 py-2 text-sm font-medium border-b-2 ${
                     tab === t
                       ? 'border-primary-500 text-primary-600'
                       : 'border-transparent text-neutral-500 hover:text-neutral-700'
                   }`}
                 >
                   {t === 'upcoming' ? 'Upcoming' : 'Gallery'}
                 </button>
               ))}
             </div>

             {tab === 'upcoming' ? (
               visible.length ? (
                 <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                   {visible.map((ev) => (
                     <EventCard
                       key={ev.id}
                       event={ev}
                       onRSVP={(s) => handleRSVP(ev, s)}
                     />
                   ))}
                 </div>
               ) : (
                 <p className="text-center text-neutral-500">No events found.</p>
               )
             ) : null}

             {tab === 'gallery' && (
               pastEvents.length ? (
                 pastEvents.map((ev) => (
                   <section
                     key={ev.id}
                     className="bg-white rounded-xl shadow-sm mb-12 overflow-hidden"
                   >
                     <header className="p-6 border-b border-neutral-200 flex justify-between">
                       <h3 className="text-xl font-semibold">{ev.title}</h3>
                       <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm">
                         {new Date(ev.start_time).toLocaleDateString()}
                       </span>
                     </header>
                     <div className="p-6">
                       <EventGallery communityId={ev.community_id} eventId={ev.id} />
                       <div className="text-center mt-6">
                         <Link
                           to={`/community/${ev.community_id}/events?event=${ev.id}`}
                           className="text-primary-500 hover:text-primary-600"
                         >
                           View details
                         </Link>
                       </div>
                     </div>
                   </section>
                 ))
               ) : (
                 <div className="text-center py-16 bg-neutral-50 rounded-lg">
                   <Camera className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                   <p className="text-neutral-600">No past events yet.</p>
                 </div>
               )
             )}

             {error && (
               <p className="text-red-600 text-center mt-8">
                 {error} {registering && '(saving…)'}
               </p>
             )}
           </main>
         </div>
       );
     }