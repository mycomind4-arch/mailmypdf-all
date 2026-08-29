/* CSS module type declarations for Vite */
declare module "*.css?url" {
  const src: string;
  export default src;
}

declare module "*.css" {
  const src: string;
  export default src;
}
