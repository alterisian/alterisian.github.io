# GitHub Copilot Instructions

## Stack

- **Ruby** 3.4.5 (+PRISM parser)
- **Rails** 8.1.2
- **Database** PostgreSQL (assumed — adjust if using MySQL/SQLite)
- **Auth** Devise
- **Tests** RSpec + FactoryBot
- **API style** REST JSON (versioned under `/api/v1/`)

---

## File Placement Guidelines
- Controllers: app/controllers/
- API controllers: app/controllers/api/v1/
- Models: app/models/
- Service objects: app/services/
- Query objects: app/queries/
- Jobs: app/jobs/
- Serializers: app/serializers/
- Concerns: app/models/concerns and app/controllers/concerns
- Factories: spec/factories/

## Code Conventions

### General
- Follow standard Ruby style: 2-space indentation, `snake_case` for methods/variables, `CamelCase` for classes
- Prefer `frozen_string_literal: true` at the top of every Ruby file
- Avoid metaprogramming unless there is a compelling reason
- Use keyword arguments for methods with more than two parameters

### Controllers
- Keep controllers thin — no business logic
- Always use strong parameters via a private `_params` method
- Scope all resource queries to `current_user` (e.g. `current_user.invoices.find(params[:id])`)
- Always include `before_action :authenticate_user!` unless the endpoint is explicitly public
- Return consistent JSON shapes (see Response Format below)

```ruby
# Good
def create
  result = CreateInvoice.call(invoice_params, user: current_user)
  render_result(result)
end

private

def invoice_params
  params.require(:invoice).permit(:title, :amount, :due_date)
end
```

### Models
- Keep models for associations, validations, and scopes only
- No service logic in callbacks — use service objects instead
- Always validate presence of required fields at the model level
- Name scopes clearly: `.active`, `.overdue`, `.for_user(user)`

### Service Objects
- Place in `app/services/`
- Use a `.call` class method as the entry point
- Return a result object or raise a domain-specific error — never return raw ActiveRecord objects from a service
- Name as verb phrases: `CreateInvoice`, `SendWelcomeEmail`, `ArchiveAccount`

```ruby
# app/services/create_invoice.rb
class CreateInvoice
  def self.call(params, user:)
    new(params, user).call
  end

  def initialize(params, user)
    @params = params
    @user   = user
  end

  def call
    @user.invoices.create!(@params)
  end
end
```

### Query Objects
- Place in `app/queries/`
- Use for anything more complex than a single `.where` or named scope
- Always accept an initial relation so queries are composable

### Background Jobs
- Place in `app/jobs/`
- Keep jobs thin — delegate to service objects
- Always set `sidekiq_options retry: N` explicitly (or whichever adapter is in use)

---

## API & Response Format

All endpoints live under `/api/v1/`. Use a base controller:

```ruby
# app/controllers/api/v1/base_controller.rb
module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      rescue_from ActiveRecord::RecordNotFound, with: :not_found
      rescue_from ActiveRecord::RecordInvalid,  with: :unprocessable

      private

      def not_found
        render json: { error: "Not found" }, status: :not_found
      end

      def unprocessable(e)
        render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
      end
    end
  end
end
```

**Success shape:**
```json
{ "data": { ... } }
```

**Error shape:**
```json
{ "error": "Human readable message" }
{ "errors": ["Validation error 1", "Validation error 2"] }
```

Never render raw ActiveRecord objects with `render json: @record`. Always use a serializer or explicit `.as_json(only: [...])`.

---

## Authentication (Devise)

- Use `current_user` helper — never look up the user by ID from params
- Token-based auth: use `devise-jwt` or `Doorkeeper` if building a headless API (do not use session cookies for API endpoints)
- Always test authentication failure cases in request specs (expect 401 when no token provided)

---

## Database & Migrations

- Always add an index for every foreign key column
- Always write a `down` method in migrations
- Never rename or drop a column in the same migration that removes it from the model (use a multi-step deploy)
- Never use `change_column` on a live table — prefer `add_column` + backfill + `remove_column`
- Use `null: false` constraints at the DB level for required fields, not just model validations

```ruby
# Good migration pattern
def up
  add_column :users, :display_name, :string, null: false, default: ""
  add_index  :users, :display_name
end

def down
  remove_column :users, :display_name
end
```

---

## Testing (RSpec + FactoryBot)

### Structure
```
spec/
  factories/         # FactoryBot factories, one file per model
  models/            # Unit tests
  services/          # Service object tests
  requests/          # API integration tests (preferred over controller specs)
  support/           # Shared contexts, helpers, matchers
```

### Rules
- **Always** write a request spec for every new API endpoint
- Cover: happy path, authentication failure (401), not found (404), validation failure (422)
- Use `FactoryBot.create` sparingly — prefer `build` or `build_stubbed` for unit tests
- Never use `let!` unless the record must exist before the example runs
- Use `described_class` instead of the hardcoded class name inside specs

```ruby
# spec/requests/api/v1/invoices_spec.rb
RSpec.describe "GET /api/v1/invoices/:id" do
  let(:user)    { create(:user) }
  let(:invoice) { create(:invoice, user: user) }
  let(:headers) { auth_headers(user) }

  it "returns the invoice" do
    get api_v1_invoice_path(invoice), headers: headers
    expect(response).to have_http_status(:ok)
    expect(json_response["data"]["id"]).to eq(invoice.id)
  end

  it "returns 401 without authentication" do
    get api_v1_invoice_path(invoice)
    expect(response).to have_http_status(:unauthorized)
  end

  it "returns 404 for another user's invoice" do
    get api_v1_invoice_path(create(:invoice)), headers: headers
    expect(response).to have_http_status(:not_found)
  end
end
```

---

## Common Pitfalls — Avoid These

| ❌ Don't | ✅ Do instead |
|---|---|
| `User.find(params[:id])` | `current_user.records.find(params[:id])` |
| `render json: @user` | Use a serializer or `.as_json(only: [...])` |
| Logic in `before_action` callbacks | Move to a service object |
| `User.all` without scoping | Always scope to `current_user` |
| N+1 queries | Use `includes(:association)` when loading has_many |
| Skipping `authenticate_user!` silently | Explicitly mark public actions with a comment |
| Rescuing `Exception` | Rescue specific error classes |

---

## Definition of Done

A task is complete when:
- [ ] Feature code is written following the conventions above
- [ ] Request spec covers happy path + 401 + relevant failure cases
- [ ] `bundle exec rubocop` passes with no offenses
- [ ] No N+1 queries introduced (check with `bullet` gem in development)
- [ ] Migration has an index on every foreign key and a `down` method
- [ ] No bare `render json:` calls on ActiveRecord objects