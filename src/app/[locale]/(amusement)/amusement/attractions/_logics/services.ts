export const AttractionServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/attractions/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/attractions/`,
    data: payload,
    params,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/attractions/${id}`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/attractions/${id}`,
  }),
}
