'use client'

import { useState, useEffect, JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/lib/store'; // Use type-only import for RootState
import { setAppointmentDate, setStep, setAvailableBlockedDates } from '@/lib/features/booking/bookingSlice'; // Import setAvailableBlockedDates
import { blockedDatesApi } from '../../pages/api/dates/blockedDatesApi'; // Import new API
import { BlockedDate } from '../../types/database'; // Import BlockedDate type
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { format, isAfter, startOfDay, parseISO } from 'date-fns';

// --- COMPONENTS ---
// Assuming these are locally defined or from shadcn/ui
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

// Custom Calendar component (simplified for demonstration, replace with shadcn/ui Calendar if available)
interface CalendarProps {
  mode: 'single' | 'multiple' | 'range';
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled: (date: Date) => boolean; // Re-added disabled prop
  className?: string;
  classNames?: string;
}

const Calendar = ({ mode, selected, onSelect, disabled, className, classNames }: CalendarProps) => {
  const [date, setDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
  const handleNextMonth = () => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));

  const renderDay = (day: number, month: number, year: number) => {
    const dayDate = new Date(year, month, day);
    const isDisabled = disabled(dayDate); // Use disabled prop for visual disabling
    const isSelected = selected && selected.toDateString() === dayDate.toDateString();
    
    let dayClasses = "h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground rounded-md";
    if (isSelected) dayClasses += " bg-blue-600 text-white hover:bg-blue-700 hover:text-white"; // Highlight selected date
    if (isDisabled) dayClasses += " text-muted-foreground opacity-50 cursor-not-allowed"; // Visually disable days here

    return (
      <button
        key={day}
        onClick={() => onSelect(dayDate)}
        disabled={isDisabled} // Apply disabled prop to button
        className={dayClasses}
      >
        {day}
      </button>
    );
  };

  const renderDays = () => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = [];
    const firstDay = firstDayOfMonth(year, month);
    const totalDays = daysInMonth(year, month);

    // Empty cells for padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<span key={`empty-${i}`} className="h-9 w-9"></span>);
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push(renderDay(i, month, year));
    }
    return days;
  };

  return (
    <div className={`p-3 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handlePrevMonth} variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{format(date, 'MMMM yyyy')}</span>
        <Button onClick={handleNextMonth} variant="ghost" size="sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-xs text-center font-medium text-gray-500">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {renderDays()}
      </div>
    </div>
  );
};

// Modal Component for Blocked Date Details
interface BlockedDateModalProps {
  blockedDate: BlockedDate;
  onClose: () => void;
}

const BlockedDateModal = ({ blockedDate, onClose }: BlockedDateModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm rounded-lg shadow-lg relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <XCircle className="h-5 w-5" />
        </Button>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Date Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-gray-800 font-medium text-lg">{blockedDate.name}</p>
          <p className="text-gray-600 text-sm">
            From: {format(parseISO(blockedDate.from_date), 'MMM d, yyyy')}
          </p>
          <p className="text-gray-600 text-sm">
            To: {format(parseISO(blockedDate.to_date), 'MMM d, yyyy')}
          </p>
          {blockedDate.reason && (
            <p className="text-gray-700 text-base mt-2">
              Reason: <span className="font-normal">{blockedDate.reason}</span>
            </p>
          )}
          <Button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700 w-full">
            Got It
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};


export function ScheduleStep() {
  const dispatch = useDispatch();
  const { appointmentDate, availableBlockedDates } = useSelector((state: RootState) => state.booking);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBlockedDateModal, setShowBlockedDateModal] = useState<BlockedDate | null>(null);

  // Fetch blocked dates on component mount
  useEffect(() => {
    const fetchBlockedDates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBlockedDates = await blockedDatesApi.getBlockedDates();
        dispatch(setAvailableBlockedDates(fetchedBlockedDates));
      } catch (err: any) {
        setError(err.message || 'Failed to load blocked dates.');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if blocked dates are not already in Redux
    if (availableBlockedDates.length === 0) {
      fetchBlockedDates();
    } else {
      setIsLoading(false); // Data already loaded
    }
  }, [dispatch, availableBlockedDates]);


  // Parse existing appointment date if available
  useEffect(() => {
    if (appointmentDate) {
      setSelectedDate(parseISO(appointmentDate));
    }
  }, [appointmentDate]);

  // This function visually disables past dates only.
  // Sundays and blocked dates from Supabase are NOT visually disabled here.
  const isDateVisuallyDisabled = (date: Date) => {
    // Disable past dates
    if (!isAfter(date, startOfDay(new Date()))) {
      return true;
    }
    
    // Allow Sundays to be clickable
    // Allow blocked dates from Supabase to be clickable (to show prompt)
    return false; 
  };

  // This function determines if a date is truly unavailable for booking (for the "Continue" button)
  // It includes past dates, Sundays, AND blocked dates from Supabase.
  const isDateActuallyUnavailable = (date: Date) => {
    // Check for past dates
    if (!isAfter(date, startOfDay(new Date()))) {
      return true;
    }
    // Check for Sundays
    if (date.getDay() === 0) {
      return true;
    }
    // Check for blocked dates from Supabase
    return blockedDatesApi.isDateBlocked(format(date, 'yyyy-MM-dd'), availableBlockedDates) !== null;
  };


  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // If the date is a past date, prevent selection and clear it
      if (!isAfter(date, startOfDay(new Date()))) {
        setSelectedDate(undefined);
        return;
      }
      // Sundays are now selectable to allow the blocked date check to run on them
      
      // Convert the selected Date object to a YYYY-MM-DD string
      const dateStr = format(date, 'yyyy-MM-dd');
      const blockedInfo = blockedDatesApi.isDateBlocked(dateStr, availableBlockedDates); // Pass the string

      if (blockedInfo) {
        setShowBlockedDateModal(blockedInfo); // Show modal with blocked date details
        setSelectedDate(undefined); // Clear selection if blocked
      } else {
        setSelectedDate(date);
      }
    } else {
      setSelectedDate(undefined);
    }
  };

  const handleNext = () => {
    // The "Continue" button should be disabled if no date is selected, or if the selected date
    // is actually unavailable (past, Sunday, or from blocked_dates table).
    if (selectedDate && !isDateActuallyUnavailable(selectedDate)) { 
      const appointmentDateStr = format(selectedDate, 'yyyy-MM-dd');
      dispatch(setAppointmentDate(appointmentDateStr));
      dispatch(setStep(5)); // Proceed to Confirmation Step
    }
  };

  const handleBack = () => {
    dispatch(setStep(3)); // Go back to Units Step
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600 text-lg">Loading calendar data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[400px] font-inter">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p className="text-red-700 text-lg mb-2">Error loading calendar data:</p>
        <p className="text-red-600 text-sm">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-blue-600 hover:bg-blue-700">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-inter">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Schedule Your Appointment</h2>
        <p className="text-gray-600">Pick your preferred date</p>
      </div>

      <div className="grid justify-center">
        {/* Date Selection */}
        <Card className="max-w-md w-full rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateVisuallyDisabled} // Use for visual disabling (past dates only)
              className="rounded-md border"
            />
            {selectedDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-800 font-medium">
                  Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Important Notes */}
      <Card className="mt-6 border-orange-200 bg-orange-50 max-w-4xl w-full rounded-xl">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900 mb-2">Important Notes:</h4>
              <ul className="text-sm text-orange-800 space-y-1">
  
                <li>• Please ensure someone is available at the scheduled time</li>
                <li>• Rescheduling must be done at least 24 hours in advance</li>
                <li>• Our technicians will arrive within the scheduled time slot</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8 max-w-4xl mx-auto w-full">
        <Button
          onClick={handleBack}
          variant="outline"
          className="px-6 py-3"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Units
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!selectedDate || isDateActuallyUnavailable(selectedDate)} // Use for disabling the button (all blocked scenarios)
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700"
        >
          Continue to Confirmation
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Blocked Date Modal */}
      {showBlockedDateModal && (
        <BlockedDateModal 
          blockedDate={showBlockedDateModal} 
          onClose={() => setShowBlockedDateModal(null)} 
        />
      )}
    </div>
  );
}
