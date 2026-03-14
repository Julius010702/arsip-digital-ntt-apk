export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🗂️ Arsip Digital NTT — API</h1>
      <p>Backend berjalan dengan baik.</p>
      <hr />
      <h2>Endpoints tersedia:</h2>
      <ul>
        <li><code>POST /api/auth/login</code></li>
        <li><code>GET|PUT /api/auth/me</code></li>
        <li><code>GET|POST /api/archives</code></li>
        <li><code>GET|PUT|DELETE /api/archives/:id</code></li>
        <li><code>GET|POST /api/categories</code></li>
        <li><code>GET|POST /api/units</code></li>
        <li><code>GET|POST /api/users</code></li>
        <li><code>GET|PUT|DELETE /api/users/:id</code></li>
        <li><code>GET /api/reports?tipe=dashboard|perUnit|perKategori</code></li>
      </ul>
      <p style={{ color: '#666', fontSize: '14px' }}>
        © 2025 Biro Organisasi Provinsi NTT
      </p>
    </main>
  )
}