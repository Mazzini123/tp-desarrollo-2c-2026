import mongoose from "mongoose";

mongoose.set("transactionAsyncLocalStorage", true);

export const transaccionesMongo = {
  ejecutar: (operacion) => mongoose.connection.transaction(() => operacion()),
};
