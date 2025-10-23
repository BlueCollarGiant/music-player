# Rails to Node.js Code Mapping Reference

This document shows the equivalent implementations between the Rails and Node.js backends.

---

## File Structure Mapping

| Rails | Node.js | Purpose |
|-------|---------|---------|
| `app/models/user.rb` | `src/models/User.js` | User model |
| `app/controllers/sessions_controller.rb` | `src/controllers/SessionsController.js` | Auth logic |
| `app/controllers/users_controller.rb` | `src/controllers/UsersController.js` | User CRUD |
| `app/services/json_web_token.rb` | `src/services/JsonWebToken.js` | JWT handling |
| `config/routes.rb` | `src/routes/*.js` | Route definitions |
| `config/initializers/omniauth.rb` | `src/config/passport.js` | OAuth config |
| `config/initializers/cors.rb` | `src/app.js` (cors middleware) | CORS config |
| `db/migrate/*` | `src/database/migrate.js` | Database migrations |
| `Gemfile` | `package.json` | Dependencies |

---

## Dependency Mapping

| Rails Gem | Node.js Package | Purpose |
|-----------|-----------------|---------|
| `rails` | `express` | Web framework |
| `pg` | `pg`, `sequelize` | PostgreSQL |
| `bcrypt` | `bcryptjs` | Password hashing |
| `jwt` | `jsonwebtoken` | JWT tokens |
| `omniauth` | `passport` | OAuth framework |
| `omniauth-google-oauth2` | `passport-google-oauth20` | Google OAuth |
| `omniauth-spotify` | `passport-spotify` | Spotify OAuth |
| `rack-cors` | `cors` | CORS middleware |
| `dotenv-rails` | `dotenv` | Environment vars |
| `active_storage` | `multer` | File uploads |
| `puma` | Built-in Node server | Web server |

---

## Code Pattern Comparisons

### 1. Model Definition

**Rails (Active Record):**
```ruby
class User < ApplicationRecord
  has_secure_password validations: false
  has_one :user_profile, dependent: :destroy
  validates :email, presence: true, uniqueness: true

  def is_admin?
    role == 'admin'
  end
end
```

**Node.js (Sequelize):**
```javascript
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  });

  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };

  return User;
};
```

---

### 2. Password Handling

**Rails:**
```ruby
user.authenticate(password)  # has_secure_password
```

**Node.js:**
```javascript
await user.validatePassword(password)  // bcryptjs
await user.setPassword(password)
```

---

### 3. JWT Token Generation

**Rails:**
```ruby
token = JsonWebToken.encode(user_id: user.id)
```

**Node.js:**
```javascript
const token = JsonWebToken.encode({ userId: user.id });
```

---

### 4. Controller Actions

**Rails:**
```ruby
class UsersController < ApplicationController
  def create
    user = User.new(user_params)
    if user.save
      render json: { user: user }, status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end
end
```

**Node.js:**
```javascript
class UsersController {
  static async create(req, res, next) {
    try {
      const user = await User.create(req.body);
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }
}
```

---

### 5. Authentication Middleware

**Rails:**
```ruby
before_action :authenticate_user!

def authenticate_user!
  token = request.headers['Authorization']&.split(' ')&.last
  decoded = JsonWebToken.decode(token)
  @current_user = User.find(decoded[:user_id])
rescue
  render json: { error: 'Unauthorized' }, status: :unauthorized
end
```

**Node.js:**
```javascript
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);

  const { valid, payload } = JsonWebToken.verify(token);
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.currentUser = await User.findByPk(payload.userId);
  next();
};
```

---

### 6. Database Associations

**Rails:**
```ruby
class User < ApplicationRecord
  has_one :user_profile
  has_many :platform_connections
end

class UserProfile < ApplicationRecord
  belongs_to :user
end
```

**Node.js:**
```javascript
// In models/index.js
User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile' });
User.hasMany(PlatformConnection, { foreignKey: 'userId' });

UserProfile.belongsTo(User, { foreignKey: 'userId' });
```

---

### 7. OAuth Configuration

**Rails (OmniAuth):**
```ruby
Rails.application.config.middleware.use OmniAuth::Builder do
  provider :google_oauth2, ENV['GOOGLE_CLIENT_ID'], ENV['GOOGLE_CLIENT_SECRET']
  provider :spotify, ENV['SPOTIFY_CLIENT_ID'], ENV['SPOTIFY_CLIENT_SECRET']
end
```

**Node.js (Passport):**
```javascript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Handle authentication
}));
```

---

### 8. OAuth Callback Handling

**Rails:**
```ruby
def omniauth
  auth = request.env['omniauth.auth']
  user = User.from_omniauth(auth)
  token = JsonWebToken.encode(user_id: user.id)
  redirect_to "#{frontend_url}?token=#{token}"
end
```

**Node.js:**
```javascript
static async omniauth(req, res) {
  const user = req.user;
  const token = JsonWebToken.encode({ userId: user.id });
  res.redirect(`${frontendUrl}?token=${token}`);
}
```

---

### 9. Finding or Creating from OAuth

**Rails:**
```ruby
def self.from_omniauth(auth)
  user = find_by(email: auth.info.email)
  user ||= create!(
    email: auth.info.email,
    provider: auth.provider,
    uid: auth.uid
  )
end
```

**Node.js:**
```javascript
User.findOrCreateFromOAuth = async function(authData) {
  let user = await User.findOne({ where: { email: authData.email } });
  if (!user) {
    user = await User.create({
      email: authData.email,
      provider: authData.provider,
      uid: authData.uid
    });
  }
  return user;
};
```

---

### 10. Routes

**Rails:**
```ruby
Rails.application.routes.draw do
  post '/login', to: 'sessions#create'
  delete '/logout', to: 'sessions#destroy'
  get '/auth/:provider/callback', to: 'sessions#omniauth'
  resources :users, only: [:create, :show]
end
```

**Node.js:**
```javascript
router.post('/login', SessionsController.create);
router.delete('/logout', SessionsController.destroy);
router.get('/auth/:provider/callback',
  passport.authenticate('provider'),
  SessionsController.omniauth
);
router.post('/users', UsersController.create);
router.get('/users/:id', authenticate, UsersController.show);
```

---

### 11. Model Validations

**Rails:**
```ruby
validates :email, presence: true, uniqueness: true
validates :username, length: { minimum: 3, maximum: 30 }
validates :username, format: { with: /\A[a-zA-Z0-9_]+\z/ }
```

**Node.js:**
```javascript
email: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    isEmail: true
  }
},
username: {
  type: DataTypes.STRING,
  validate: {
    len: [3, 30],
    is: /^[a-zA-Z0-9_]+$/
  }
}
```

---

### 12. Callbacks/Hooks

**Rails:**
```ruby
before_validation :set_default_role, on: :create
after_create :create_user_profile

def set_default_role
  self.role ||= 'user'
end
```

**Node.js:**
```javascript
{
  hooks: {
    beforeCreate: async (user) => {
      if (!user.role) {
        user.role = 'user';
      }
    }
  }
}
```

---

### 13. Scopes

**Rails:**
```ruby
scope :active, -> { where('expires_at IS NULL OR expires_at > ?', Time.current) }
scope :by_platform, ->(platform) { where(platform: platform) }
```

**Node.js:**
```javascript
PlatformConnection.active = function() {
  return this.findAll({
    where: sequelize.literal('expires_at IS NULL OR expires_at > NOW()')
  });
};

PlatformConnection.byPlatform = function(platform) {
  return this.findAll({ where: { platform } });
};
```

---

### 14. Transactions

**Rails:**
```ruby
ActiveRecord::Base.transaction do
  user = User.create!(email: email)
  UserProfile.create!(user: user, username: username)
end
```

**Node.js:**
```javascript
const transaction = await sequelize.transaction();
try {
  const user = await User.create({ email }, { transaction });
  await UserProfile.create({ userId: user.id, username }, { transaction });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

### 15. JSON Serialization

**Rails:**
```ruby
def as_json(options = {})
  super(options.merge(except: [:password_digest]))
end
```

**Node.js:**
```javascript
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.passwordDigest;
  return values;
};
```

---

## Environment Variables

**Rails (.env):**
```
DATABASE_URL=postgresql://user:pass@localhost/db
GOOGLE_CLIENT_ID=xxx
JWT_SECRET=xxx
```

**Node.js (.env):**
```
DB_HOST=localhost
DB_NAME=db
DB_USER=user
DB_PASSWORD=pass
GOOGLE_CLIENT_ID=xxx
JWT_SECRET=xxx
```

---

## Running Commands

| Task | Rails | Node.js |
|------|-------|---------|
| Install deps | `bundle install` | `npm install` |
| Run server | `rails server` | `npm run dev` |
| Run migrations | `rails db:migrate` | `npm run migrate` |
| Create DB | `rails db:create` | `createdb dbname` |
| Console | `rails console` | `node` + manual import |

---

## Key Behavioral Differences

### 1. **Async/Await**
- Rails uses synchronous code by default
- Node.js requires `async/await` for database operations

### 2. **Error Handling**
- Rails uses `rescue` blocks
- Node.js uses `try/catch` or `.catch()`

### 3. **Middleware Order**
- Rails: defined via `before_action` in controllers
- Node.js: defined via `app.use()` in Express

### 4. **File Naming**
- Rails: snake_case (`user_profile.rb`)
- Node.js: PascalCase for classes (`UserProfile.js`)

### 5. **Module System**
- Rails: `require` and class inheritance
- Node.js: ES6 `import/export`

---

## Testing Equivalents

| Rails | Node.js |
|-------|---------|
| RSpec | Jest / Mocha |
| FactoryBot | Factory functions |
| Faker | faker.js |
| DatabaseCleaner | Sequelize transactions |

---

**Note:** This is a living document. Update as more features are migrated.
