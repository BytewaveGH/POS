export const ProductServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/products/`,
    params,
  }),

  FetchAllUnit: (params?: any) => ({
    method: 'GET',
    url: `/units/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/products/`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/products/${id}`,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/products/${id}`,
    data: payload,
    params,
  }),

  UpdateUnit: (productId: number, unitRecordId: number, payload: any) => ({
    method: 'PUT',
    url: `/products/${productId}/units/${unitRecordId}`,
    data: payload,
  }),

  AddUnit: (productId: number, payload: any) => ({
    method: 'POST',
    url: `/products/${productId}/units/`,
    data: payload,
  }),

  DeleteUnit: (productId: number, unitRecordId: number) => ({
    method: 'DELETE',
    url: `/products/${productId}/units/${unitRecordId}`,
  }),
}

export const InvoiceServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/invoices/`,
    params,
  }),

  Create: (payload: any, params?: any) => ({
    method: 'POST',
    url: `/invoices/`,
    data: payload,
    params,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/invoices/${id}`,
  }),

  Update: (id: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/invoices/${id}`,
    data: payload,
    params,
  }),
  MarkAsPaid: (id: number) => ({
    method: 'PATCH',
    url: `/invoices/${id}/pay`,
  }),

  MarkAsPending: (id: number) => ({
    method: 'PATCH',
    url: `/invoices/${id}/unpay`,
  }),

  FetchByStatus: (status: 'pending' | 'paid', params?: any) => ({
    method: 'GET',
    url: `/invoices/`,
    params: { ...params, status },
  }),
}
export const StocksServices = {
  FetchShortages: (params?: any) => ({
    method: 'GET',
    url: `/stock/shortages`,
    params,
  }),

  FetchAll: (productId: number, params?: any) => ({
    method: 'GET',
    url: `/products/${productId}/stock/`,
    params,
  }),

  Create: (productId: number, payload: any, params?: any) => ({
    method: 'POST',
    url: `/products/${productId}/stock/`,
    data: payload,
    params,
  }),

  Update: (productId: number, stockId: number, payload: any, params?: any) => ({
    method: 'PUT',
    url: `/products/${productId}/stock/${stockId}`,
    data: payload,
    params,
  }),

  Restock: (productId: number, stockId: number, payload: any, params?: any) => ({
    method: 'PATCH',
    url: `/products/${productId}/stock/${stockId}`,
    data: payload,
    params,
  }),
  FetchHistory: (productId: number, stockId: number, params?: any) => ({
    method: 'GET',
    url: `/products/${productId}/stock/${stockId}/history`,
    params,
  }),

  Delete: (productId: number, stockId: number) => ({
    method: 'DELETE',
    url: `/products/${productId}/stock/${stockId}`,
  }),

  BulkCreate: (productId: number, payload: { warehouseId: number; quantity: number }[]) => ({
    method: 'POST',
    url: `/products/${productId}/stock/bulk`,
    data: payload,
  }),
}

export const TransferServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/transfers`,
    params,
  }),

  Create: (payload: { fromStockId: number; toStockId: number; quantity: number; note?: string }) => ({
    method: 'POST',
    url: `/transfers`,
    data: payload,
  }),

  Confirm: (id: number, payload: { confirmedBy: number }) => ({
    method: 'PATCH',
    url: `/transfers/${id}/confirm`,
    data: payload,
  }),

  Cancel: (id: number) => ({
    method: 'PATCH',
    url: `/transfers/${id}/cancel`,
  }),
}

/**
 * Operations are business expenses (rent, salary, utilities, etc.) tracked
 * against revenue/profit to give a complete picture of net profitability.
 *
 * Suggested backend DTO:
 *   CreateOperationRequest { name, category, amount, date, frequency, notes }
 *   UpdateOperationRequest { name?, category?, amount?, date?, frequency?, notes? }
 *
 * Routes: GET/POST /operations/  ·  PUT/DELETE /operations/:id
 */
export const OperationsServices = {
  FetchAll: (params?: any) => ({
    method: 'GET',
    url: `/operations/`,
    params,
  }),

  Create: (payload: any) => ({
    method: 'POST',
    url: `/operations/`,
    data: payload,
  }),

  Update: (id: number, payload: any) => ({
    method: 'PUT',
    url: `/operations/${id}`,
    data: payload,
  }),

  Delete: (id: number) => ({
    method: 'DELETE',
    url: `/operations/${id}`,
  }),
}
