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
    locationId: UUID;
    serviceId: UUID;
    appointmentDate: string; // DateString
    appointmentTime: string | null; // TimeString
    totalAmount: number;
    totalUnits: number;
    notes: string | null;
    selectedDeviceIds: UUID[]; // IDs of existing devices selected for service
    newDevices: NewBookingDeviceData[]; // Data for new devices to be added
  }): Promise<Appointment> => {
    const {
      clientId,
      locationId,
      serviceId,
      appointmentDate,
      appointmentTime,
      totalAmount,
      totalUnits,
      notes,
      selectedDeviceIds,
      newDevices,
    } = bookingData;

    // --- Added/modified validation for clientId ---
    // Basic validation for required fields
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      throw new Error('Invalid clientId: Must be a non-empty string UUID.');
    }
    // Optional: Add a more rigorous UUID format validation if needed, e.g., using a regex
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // if (!uuidRegex.test(clientId)) {
    //   throw new Error('Invalid clientId: Does not match UUID format.');
    // }
    // --- End of added/modified validation for clientId ---

    if (!locationId || !serviceId || !appointmentDate || !totalAmount) {
      throw new Error('Missing required booking information.');
    }

    try {
      // 1. Insert a new appointment into the 'appointments' table
      // Supabase will automatically generate the 'id', 'created_at', 'updated_at'
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          client_id: clientId,
          location_id: locationId,
          service_id: serviceId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          amount: totalAmount,
          total_units: totalUnits,
          notes: notes,
          status: 'confirmed', // Assuming 'confirmed' as per previous request
        })
        .select()
        .single();

      if (appointmentError) {
        console.error('Supabase Error creating appointment:', appointmentError);
        // Check for specific error codes, e.g., foreign key violation (PostgreSQL code '23503')
        if (appointmentError.code === '23503') { 
          throw new Error(`Foreign key constraint failed. Ensure client, location, and service IDs exist in their respective tables: ${appointmentError.message}`);
        }
        throw new Error(`Failed to create appointment: ${appointmentError.message}`);
      }

      const newAppointmentId: UUID = newAppointment.id;
      const deviceHistoryRecords: Omit<DeviceHistory, 'id'>[] = [];

      // 2. Update existing selected devices and prepare history records
      if (selectedDeviceIds && selectedDeviceIds.length > 0) {
        // First, fetch the existing devices to get their current details for history
        const { data: existingDevicesToUpdate, error: fetchExistingError } = await supabase
          .from('devices')
          .select('*')
          .in('id', selectedDeviceIds);

        if (fetchExistingError) {
          console.error('Supabase Error fetching existing devices:', fetchExistingError);
          throw new Error(`Failed to fetch existing devices for update: ${fetchExistingError.message}`);
        }

        // Update the 'devices' table
        const { error: updateError } = await supabase
          .from('devices')
          .update({
            appointment_id: newAppointmentId,
            last_cleaning_date: appointmentDate,
            updated_at: new Date().toISOString(),
          })
          .in('id', selectedDeviceIds);

        if (updateError) {
          console.error('Supabase Error updating existing devices:', updateError);
          throw new Error(`Failed to update existing devices: ${updateError.message}`);
        }

        // Prepare history records for the updated devices
        // existingDevicesToUpdate.forEach((device: Device) => {
        //   deviceHistoryRecords.push({
        //     device_id: device.id,
        //     appointment_id: newAppointmentId,
        //     service_date: appointmentDate,
        //     service_type_id: serviceId,
        //     notes: notes,
        //     created_at: new Date().toISOString(),
        //   });
        // });
      }

      // 3. Insert new devices and prepare history records
      if (newDevices && newDevices.length > 0) {
        const devicesToInsert = newDevices.map((deviceData: NewBookingDeviceData) => ({
          client_id: clientId,
          location_id: locationId,
          appointment_id: newAppointmentId, // Link to the new appointment
          name: deviceData.name || 'New AC Unit', // Provide a default name if not given
          brand_id: deviceData.brand_id,
          ac_type_id: deviceData.ac_type_id,
          horsepower_id: deviceData.horsepower_id,
          last_cleaning_date: appointmentDate, // Set last cleaning date to appointment date
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data: insertedDevices, error: insertNewError } = await supabase
          .from('devices')
          .insert(devicesToInsert)
          .select(); // Select the inserted data to get their generated IDs

        if (insertNewError) {
          console.error('Supabase Error inserting new devices:', insertNewError);
          throw new Error(`Failed to insert new devices: ${insertNewError.message}`);
        }

        // Prepare history records for the newly inserted devices
        // insertedDevices.forEach((device: Device) => {
        //   deviceHistoryRecords.push({
        //     device_id: device.id, // Use the ID generated by Supabase
        //     appointment_id: newAppointmentId,
        //     service_date: appointmentDate,
        //     service_type_id: serviceId,
        //     notes: notes,
        //     created_at: new Date().toISOString(),
        //   });
        // });
      }

      // 4. Insert all device history records in a single batch
    //   if (deviceHistoryRecords.length > 0) {
    //     const { error: historyInsertError } = await supabase
    //       .from('devices_history')
    //       .insert(deviceHistoryRecords);

    //     if (historyInsertError) {
    //       console.error('Supabase Error inserting device history:', historyInsertError);
    //       throw new Error(`Failed to insert device history: ${historyInsertError.message}`);
    //     }
    //   }

      return newAppointment; // Return the successfully created appointment
    } catch (error) {
      console.error('Error during client booking process:', error);
      throw error; // Re-throw the error for the caller to handle
    }
  },
};
