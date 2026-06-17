export const EmployeeServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: '/employees/',
    params,
  }),

  FetchOne: (id: number) => ({
    method: 'GET',
    url: `/employees/${id}`,
  }),

  Create: (payload: any) => ({
    method: 'POST',
    url: '/employees/',
    data: payload,
  }),

  Update: (id: number, payload: any) => ({
    method: 'PUT',
    url: `/employees/${id}`,
    data: payload,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/employees/${id}`,
  }),
}
