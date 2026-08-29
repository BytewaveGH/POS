export const BookingServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/bookings/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/bookings/`,
    data: payload,
    params,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/bookings/${id}`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/bookings/${id}`,
  }),
}
