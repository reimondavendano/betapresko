// src/api/clientPanelBooking.ts
import { supabase } from '../../../lib/supabase'; // Adjust path as needed
import { UUID, Device, DeviceHistory, Appointment } from '../../../types/database'; // Import necessary types

/**
 * Interface for new devices passed during the booking process.
 * These are devices that the client is adding for the first time.
 */
interface NewBookingDeviceData {
  name: string;
  brand_id: UUID | null;
  ac_type_id: UUID | null;
  horsepower_id: UUID | null;
  quantity: number; // Assuming quantity for new devices
  location_id?: UUID | null;
}

// Define a new type for a device to be booked, which includes its assigned location
interface BookedClientDevice extends Device {
  location_id: UUID;
}


export const clientPanelBooking = {
  /**
   * Handles the complete client booking process, including:
   * 1. Creating a new appointment.
   * 2. Updating existing selected devices with the new appointment ID and last cleaning date.
   * 3. Inserting any newly added devices.
   * 4. Recording service history for all serviced (existing and new) devices.
   *
   * @param bookingData The data required to create a new booking.
   * @returns The newly created Appointment object.
   * @throws Error if any database operation fails.
   */
  createClientBooking: async (bookingData: {
    clientId: UUID;
    primaryLocationId: UUID | null; // Now accepts a primaryLocationId for fallback
    serviceId: UUID;
    appointmentDate: string; // DateString
    appointmentTime: string | null; // TimeString
    totalAmount: number;
    totalUnits: number;
    notes: string | null;
    selectedDevices: BookedClientDevice[]; // Array of existing devices with location_id
    newDevices: NewBookingDeviceData[]; // Data for new devices to be added
  }): Promise<Appointment> => {
    const {
      clientId,
      primaryLocationId, // Use this for fallback
      serviceId,
      appointmentDate,
      appointmentTime,
      totalAmount,
      totalUnits,
      notes,
      selectedDevices,
      newDevices,
    } = bookingData;

    // Basic validation for required fields
    if (!clientId || !serviceId || !appointmentDate || !totalAmount) {
      throw new Error('Missing required booking information.');
    }

    // Determine the location_id for the appointment, prioritizing selected devices first.
    // Falls back to the primary location ID if no devices have a location set.
    const appointmentLocationId = 
      selectedDevices.length > 0 
        ? selectedDevices[0].location_id 
        : (newDevices.length > 0 && newDevices[0].location_id) 
        ? newDevices[0].location_id 
        : primaryLocationId;

    try {
      // 1. Insert a new appointment into the 'appointments' table
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: clientId,
          location_id: appointmentLocationId,
          service_id: serviceId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          amount: totalAmount,
          total_units: totalUnits,
          notes: notes,
          status: 'confirmed',
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('Supabase Error creating appointment:', appointmentError);
        if (appointmentError.code === '23503') { 
          throw new Error(`Foreign key constraint failed. Ensure client and service IDs exist: ${appointmentError.message}`);
        }
        throw new Error(`Failed to create appointment: ${appointmentError.message}`);
      }

      const newAppointmentId: UUID = newAppointment.id;
      const deviceHistoryRecords: Omit<DeviceHistory, 'id'>[] = [];

      // Note: No existing devices to update - only handling new devices

      // 2. Insert new devices
      // Note: Don't set last_cleaning_date until appointment status becomes 'completed'
      if (newDevices && newDevices.length > 0) {
        const devicesToInsert = newDevices.map((deviceData: NewBookingDeviceData) => ({
          client_id: clientId,
          location_id: deviceData.location_id,
          appointment_id: newAppointmentId, // Link to the new appointment
          name: deviceData.name || 'New AC Unit',
          brand_id: deviceData.brand_id,
          ac_type_id: deviceData.ac_type_id,
          horsepower_id: deviceData.horsepower_id,
          last_cleaning_date: null, // Only set when appointment is completed
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data: insertedDevices, error: insertNewError } = await supabase
          .from('devices')
          .insert(devicesToInsert)
          .select();

        if (insertNewError) {
          console.error('Supabase Error inserting new devices:', insertNewError);
          throw new Error(`Failed to insert new devices: ${insertNewError.message}`);
        }
      }

      return newAppointment;
    } catch (error) {
      console.error('Error during client booking process:', error);
      throw error;
    }
  },

  /**
   * Completes an appointment and updates all associated device cleaning dates
   * This should be called by admin when the service is actually completed
   */
  completeAppointment: async (appointmentId: UUID): Promise<{ appointment: Appointment; updatedDevicesCount: number }> => {
    try {
      // 1. Update appointment status to 'completed'
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (appointmentError) {
        console.error(`Error updating appointment status ${appointmentId}:`, appointmentError);
        throw new Error(appointmentError.message);
      }

      // 2. Update all devices associated with this appointment to set last_cleaning_date
      // This will automatically update due_3_months, due_4_months, and due_6_months via database triggers
      const { data: updatedDevices, error: deviceUpdateError } = await supabase
        .from('devices')
        .update({ 
          last_cleaning_date: appointment.appointment_date,
          updated_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId)
        .select();

      if (deviceUpdateError) {
        console.error(`Error updating device cleaning dates for appointment ${appointmentId}:`, deviceUpdateError);
        throw new Error(`Failed to update device cleaning dates: ${deviceUpdateError.message}`);
      }

      return {
        appointment: appointment as Appointment,
        updatedDevicesCount: updatedDevices?.length || 0
      };
    } catch (error) {
      console.error('Error during appointment completion process:', error);
      throw error;
    }
  },
};