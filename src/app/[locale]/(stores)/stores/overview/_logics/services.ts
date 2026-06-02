export const StatisticsServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/stats/overview`,
    params,
  }),
  FetchSales: (params?: any) => ({
    method: 'GET',
    url: `/stats/sales`,
    params,
  }),
  FetchProducts: (params?: any) => ({
    method: 'GET',
    url: `/stats/products/top`,
    params,
  }),
  FetchWarehouses: (params?: any) => ({
    method: 'GET',
    url: `/stats/warehouses`,
    params,
  }),
  FetchShortages: (params?: any) => ({
    method: 'GET',
    url: `/stock/shortages`,
    params,
  }),
}
