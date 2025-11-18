export default class UserService {
  constructor(db) {
    this.db = db;
  }

  ensureUser(from) {
    const data = this.db.read();
    let user = data.users.find((u) => u.id === from.id);
    if (!user) {
      user = {
        id: from.id,
        login: from.username || 'unknown',
        name: [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Без имени',
        phone: '',
        registeredAt: new Date().toISOString(),
        purchases: []
      };
      data.users.push(user);
      this.db.write(data);
    }
    return user;
  }

  addPurchase(userId, projectName) {
    const data = this.db.read();
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      return null;
    }
    if (!user.purchases.includes(projectName)) {
      user.purchases.push(projectName);
      this.db.write(data);
    }
    return user;
  }

  listUsers() {
    const data = this.db.read();
    return data.users;
  }
}
