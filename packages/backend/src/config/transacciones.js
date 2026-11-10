import { AsyncLocalStorage } from "node:async_hooks";
import mongoose from "mongoose";

mongoose.set("transactionAsyncLocalStorage", true);

const transaccionEnCurso = new AsyncLocalStorage();

export const transaccionesMongo = {
  ejecutar(operacion) {
    if (transaccionEnCurso.getStore()) return operacion();
    return mongoose.connection.transaction(() => transaccionEnCurso.run(true, operacion));
  },
};
