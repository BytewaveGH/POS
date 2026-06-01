export const UnitServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/units/`,
    params,
  }),
  

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/units/`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/units/${id}`,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/units/${id}`,
    data: payload,
    params,
  }),

}

export const WarehouseServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/warehouses/`,
    params,
  }),
  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/warehouses/`,
    data: payload,
    params,
  }),
  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/warehouses/${id}`,
  }),
  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/warehouses/${id}`,
    data: payload,
    params,
  }),
}