export function serializarColaborador(colaborador) {
  return { ...colaborador, pronombres: [...colaborador.pronombres] };
}
