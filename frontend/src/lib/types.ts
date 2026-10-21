// Alias legibles sobre los tipos generados desde el OpenAPI de Django (npm run generate:types).
import type { components, paths } from "./api-types";

type Schemas = components["schemas"];

export type Usuario = Schemas["UsuarioOut"];
export type LoginInput = Schemas["LoginIn"];
export type Gasto = Schemas["GastoOut"];
export type GastoInput = Schemas["GastoIn"];
export type GastoPage = Schemas["GastoPage"];
export type Resumen = Schemas["ResumenOut"];
export type Categoria = Schemas["Categoria"];
export type ErrorOut = Schemas["ErrorOut"];

export type GastosQuery = NonNullable<paths["/api/gastos"]["get"]["parameters"]["query"]>;
export type Orden = NonNullable<GastosQuery["orden"]>;
