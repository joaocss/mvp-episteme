/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'pg' e nativo do Node; nao deve ser empacotado pelo bundler.
  serverExternalPackages: ["pg"],
};
export default nextConfig;
