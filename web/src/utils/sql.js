export function execSql(api, query, datasource, onSuccess, onError) {
  console.log(query, datasource, {"query": query, datasource_id: datasource})
  api.post('/query', {"query": query, datasource_id: datasource}, {
    json: (j) => {
    console.log(j)
    onSuccess(j)

    },
    error: err => {
      console.log(err)
      onError && onError(err)
    }
  })
}
