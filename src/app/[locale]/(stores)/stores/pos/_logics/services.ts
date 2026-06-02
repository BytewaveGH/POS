export const SalesServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/sales/`,
    params,
  }),
  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/sales/`,
    data: payload,
    params,
  }),
  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/sales/${id}`,
  }),
  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/sales/${id}`,
    data: payload,
    params,
  }),
}
