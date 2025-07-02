import { useState, useRef, useEffect, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ConfettiExplosion from 'react-confetti-explosion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  Sparkles,
  X,
} from 'lucide-react';

// Conditionally import Tilt to handle potential module issues
let Tilt: any = null;
try {
  Tilt = require('react-parallax-tilt').default;
} catch (error) {
  console.warn('react-parallax-tilt not available, falling back to div', error);
}

/* ------------------------------------------------------------------ */
/* Types                                                             */
/* ------------------------------------------------------------------ */

export type RSVPStatus = 'going' | 'maybe' | 'not_going';

export interface EventCardProps {
  event: {
    id: string;
    slug: string;
    title: string;
    start_time: string; // ISO-string
    end_time?: string;
    image_url?: string;
    location?: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    rsvp_count: number;
    capacity?: number | null;
    user_rsvp?: { status: RSVPStatus | null };
  };
  onRSVPChange?: (status: RSVPStatus) => Promise<void> | void;
  isCompact?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                           */
/* ------------------------------------------------------------------ */

const PLACEHOLDER =
  'https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=400';

const RSVP_STATUSES: RSVPStatus[] = ['going', 'maybe', 'not_going'];

const STATUS_COLOR: Record<string, string> = {
  upcoming: 'bg-gradient-to-r from-primary-500 to-primary-700 text-white',
  ongoing: 'bg-gradient-to-r from-secondary-500 to-secondary-700 text-white',
  completed: 'bg-gradient-to-r from-neutral-500 to-neutral-700 text-white',
  cancelled: 'bg-gradient-to-r from-momfit-primary to-red-600 text-white',
};

const RSVP_LABEL: Record<RSVPStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: 'Not Going',
};

const RSVP_COLOR: Record<RSVPStatus, string> = {
  going: 'bg-gradient-to-r from-momfit-primary to-red-600 text-white border-momfit-primary',
  maybe: 'bg-gradient-to-r from-accent-400 to-accent-600 text-white border-accent-500',
  not_going: 'bg-gradient-to-r from-neutral-400 to-neutral-600 text-white border-neutral-500',
};

const RSVP_ICON: Record<RSVPStatus, React.ComponentType<{ className?: string }>> = {
  going: Check,
  maybe: Sparkles,
  not_going: X,
};

const STYLES = {
  card: 'bg-white rounded-2xl shadow-lg hover:shadow-xl hover:shadow-primary-200/50 transition-all cursor-pointer font-body',
  compactCard: 'bg-white rounded-2xl shadow-md hover:shadow-lg hover:shadow-primary-200/50 transition-all cursor-pointer font-body',
  imageFull: 'h-72 sm:h-96',
  imageCompact: 'h-36 sm:h-48',
  textSmall: 'text-xs sm:text-sm',
  textBase: 'text-sm sm:text-base',
};

/* Helper to get RSVP icon component */
const getRSVPIcon = (status: RSVPStatus | null): React.ComponentType<{ className?: string }> | null => {
  if (!status || !RSVP_STATUSES.includes(status)) return null;
  return RSVP_ICON[status];
};

/* Animation variants for dropdown */
const dropdownVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.15 } },
};

/* ------------------------------------------------------------------ */
/* Component                                                         */
/* ------------------------------------------------------------------ */

export default function EventCard({
  event,
  onRSVPChange,
  isCompact = false,
}: EventCardProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus | null>(event.user_rsvp?.status ?? null);
  const [showConfetti, setShowConfetti] = useState(false);

  /* Click-outside to close dropdown */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  /* RSVP handler with confetti */
  const handleRSVP = async (status: RSVPStatus) => {
    if (isBusy || status === rsvpStatus) return;
    setIsBusy(true);
    const previousStatus = rsvpStatus;
    setRsvpStatus(status);
    try {
      if (onRSVPChange) {
        await onRSVPChange(status);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000); // Hide confetti after 2s
      }
      setIsDropdownOpen(false);
    } catch {
      setRsvpStatus(previousStatus); // Revert on error
    } finally {
      setIsBusy(false);
    }
  };

  /* Navigation */
  const goDetail = () => navigate(`/event/${event.slug}`);

  /* Date/time formatting */
  const parsedDate = new Date(event.start_time);
  const fmtDate = isValid(parsedDate) ? format(parsedDate, 'EEE, MMM d') : 'Invalid Date';
  const fmtTime = isValid(parsedDate) ? format(parsedDate, 'p') : 'Invalid Time';
  const fmtEndTime = event.end_time && isValid(new Date(event.end_time))
    ? ` - ${format(new Date(event.end_time), 'p')}`
    : '';

  /* Stop propagation for RSVP clicks */
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  /* RSVP count progress ring */
  const progress = event.capacity ? (event.rsvp_count / event.capacity) * 100 : 0;

  /* Fallback wrapper if Tilt is unavailable */
  const CardWrapper = Tilt ? Tilt : motion.div;
  const tiltProps = Tilt
    ? {
        tiltMaxAngleX: isCompact ? 5 : 8,
        tiltMaxAngleY: isCompact ? 5 : 8,
        glareEnable: true,
        glareMaxOpacity: isCompact ? 0.2 : 0.3,
        scale: 1.02,
      }
    : {};

  /* ------------------------------------------------------------------ */
  /* Compact Card                                                      */
  /* ------------------------------------------------------------------ */
  if (isCompact) {
    const Icon = getRSVPIcon(rsvpStatus);
    return (
      <CardWrapper {...tiltProps}>
        <motion.div
          className={STYLES.compactCard}
          onClick={goDetail}
          whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
        >
          <div className={`relative ${STYLES.imageCompact}`}>
            <img
              src={event.image_url || PLACEHOLDER}
              onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
              alt={event.title}
              className={`w-full ${STYLES.imageCompact} object-cover rounded-t-2xl ${!event.image_url ? 'animate-pulse bg-neutral-200' : ''}`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className={`absolute top-3 right-3 px-2 py-1 ${STYLES.textSmall} rounded-full capitalize backdrop-blur-sm ${STATUS_COLOR[event.status]}`}>
              {event.status}
            </span>
          </div>
          <div className="p-4 relative">
            <h3 className={`font-heading font-bold ${STYLES.textBase} line-clamp-2 mb-2 text-neutral-900`}>{event.title}</h3>
            <div className={`${STYLES.textSmall} text-neutral-600 space-y-1.5 mb-4`}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                {fmtDate}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                {fmtTime}
                {fmtEndTime}
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                <span className="relative inline-block w-5 h-5">
                  <svg className="absolute w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="4"
                      strokeDasharray={`${progress}, 100`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                    {event.rsvp_count}
                  </span>
                </span>
                {event.capacity ? ` / ${event.capacity}` : ''} going
              </div>
            </div>
            <div className="relative" onClick={stop}>
              <motion.button
                type="button"
                disabled={isBusy}
                aria-label={rsvpStatus ? `Change RSVP status, currently ${RSVP_LABEL[rsvpStatus]}` : 'Set RSVP status'}
                aria-expanded={isDropdownOpen}
                className={`w-full py-2 rounded-full font-semibold flex items-center justify-center gap-2 ${STYLES.textSmall} ${
                  rsvpStatus ? RSVP_COLOR[rsvpStatus] : 'bg-gradient-to-r from-primary-600 to-primary-800 text-white border-primary-600'
                } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:shadow-primary-300/50'}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                whileTap={{ scale: 0.95 }}
              >
                {showConfetti && (
                  <ConfettiExplosion
                    force={0.4}
                    duration={2000}
                    particleCount={30}
                    width={400}
                    zIndex={100}
                  />
                )}
                {isBusy ? (
                  'Updating...'
                ) : rsvpStatus ? (
                  <>
                    {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                    {rsvpStatus && RSVP_LABEL[rsvpStatus]}
                  </>
                ) : (
                  'RSVP'
                )}
              </motion.button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    ref={dropdownRef}
                    className="absolute bottom-full mb-2 w-full bg-white/90 border border-white/50 rounded-lg shadow-2xl z-50 backdrop-blur-md"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {RSVP_STATUSES.map((status) => {
                      const DropdownIcon = RSVP_ICON[status];
                      return (
                        <motion.button
                          key={status}
                          type="button"
                          disabled={isBusy}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 ${STYLES.textBase} hover:bg-primary-50/80 hover:text-primary-600 ${
                            rsvpStatus === status ? 'bg-primary-50 text-primary-600' : ''
                          }`}
                          onClick={() => handleRSVP(status)}
                          aria-label={`Set RSVP to ${RSVP_LABEL[status]}`}
                          whileHover={{ x: 5 }}
                        >
                          <DropdownIcon className="h-4 w-4" aria-hidden="true" />
                          {RSVP_LABEL[status]}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </CardWrapper>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Full Card                                                         */
  /* ------------------------------------------------------------------ */
  const Icon = getRSVPIcon(rsvpStatus);
  return (
    <CardWrapper {...tiltProps}>
      <motion.div
        className={STYLES.card}
        onClick={goDetail}
        whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      >
        <div className={`relative ${STYLES.imageFull}`}>
          <img
            src={event.image_url || PLACEHOLDER}
            onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
            alt={event.title}
            className={`w-full ${STYLES.imageFull} object-cover rounded-t-2xl ${!event.image_url ? 'animate-pulse bg-neutral-200' : ''}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className={`absolute top-4 right-4 px-3 py-1.5 ${STYLES.textBase} rounded-full capitalize backdrop-blur-sm ${STATUS_COLOR[event.status]}`}>
            {event.status}
          </span>
          <h3 className="absolute bottom-4 left-4 text-xl sm:text-2xl font-heading font-bold text-white drop-shadow-lg line-clamp-2">{event.title}</h3>
        </div>
        <div className="p-6 relative">
          <div className={`${STYLES.textBase} text-neutral-700 space-y-2 mb-6`}>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              {fmtDate}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              {fmtTime}
              {fmtEndTime}
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-neutral-500" aria-hidden="true" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" aria-hidden="true" />
              <span className="relative inline-block w-6 h-6">
                <svg className="absolute w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="4"
                    strokeDasharray={`${progress}, 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold">
                  {event.rsvp_count}
                </span>
              </span>
              {event.capacity ? ` / ${event.capacity}` : ''} going
            </div>
          </div>
          <div className="relative" onClick={stop}>
            <motion.button
              type="button"
              disabled={isBusy}
              aria-label={rsvpStatus ? `Change RSVP status, currently ${RSVP_LABEL[rsvpStatus]}` : 'Set RSVP status'}
              aria-expanded={isDropdownOpen}
              className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-3 ${STYLES.textBase} ${
                rsvpStatus ? RSVP_COLOR[rsvpStatus] : 'bg-gradient-to-r from-primary-600 to-primary-800 text-white border-primary-600'
              } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:shadow-primary-300/50'}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              whileTap={{ scale: 0.95 }}
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {showConfetti && (
                <ConfettiExplosion
                  force={0.6}
                  duration={2000}
                  particleCount={50}
                  width={600}
                  zIndex={100}
                />
              )}
              {isBusy ? (
                'Updating...'
              ) : rsvpStatus ? (
                <>
                  {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
                  {rsvpStatus && RSVP_LABEL[rsvpStatus]}
                </>
              ) : (
                'RSVP'
              )}
            </motion.button>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  ref={dropdownRef}
                  className="absolute bottom-full mb-2 w-full bg-white/90 border border-white/50 rounded-lg shadow-2xl z-50 backdrop-blur-md"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {RSVP_STATUSES.map((status) => {
                    const DropdownIcon = RSVP_ICON[status];
                    return (
                      <motion.button
                        key={status}
                        type="button"
                        disabled={isBusy}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${STYLES.textBase} hover:bg-primary-50/80 hover:text-primary-600 ${
                          rsvpStatus === status ? 'bg-primary-50 text-primary-600' : ''
                        }`}
                        onClick={() => handleRSVP(status)}
                        aria-label={`Set RSVP to ${RSVP_LABEL[status]}`}
                        whileHover={{ x: 5 }}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <DropdownIcon className="h-5 w-5" aria-hidden="true" />
                        {RSVP_LABEL[status]}
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </CardWrapper>
  );
}