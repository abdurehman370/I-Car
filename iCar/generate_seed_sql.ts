import bcrypt from 'bcryptjs';

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  console.log(`INSERT INTO User (username, password, role, createdAt, updatedAt) VALUES ('admin', '${hashedPassword}', 'admin', '${now}', '${now}') ON DUPLICATE KEY UPDATE password='${hashedPassword}';`);
}

main();
