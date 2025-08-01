# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2025_07_22_214549) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "password_resets", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "reset_token", null: false
    t.boolean "used", default: false, null: false
    t.datetime "expires_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["reset_token"], name: "index_password_resets_on_reset_token", unique: true
    t.index ["user_id"], name: "index_password_resets_on_user_id"
  end

  create_table "platform_connections", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "platform"
    t.string "platform_user_id"
    t.text "access_token"
    t.text "refresh_token"
    t.datetime "expires_at"
    t.text "scopes"
    t.datetime "connected_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "platform"], name: "index_platform_connections_on_user_and_platform", unique: true
    t.index ["user_id"], name: "index_platform_connections_on_user_id"
  end

  create_table "user_avatars", force: :cascade do |t|
    t.bigint "user_profile_id", null: false
    t.string "current_avatar"
    t.datetime "change_date", precision: nil
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_profile_id"], name: "index_user_avatars_on_user_profile_id"
  end

  create_table "user_name_change_logs", force: :cascade do |t|
    t.integer "user_profile_id", null: false
    t.string "old_username"
    t.string "current_username"
    t.datetime "change_date", precision: nil
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_profile_id"], name: "index_user_name_change_logs_on_user_profile_id"
  end

  create_table "user_profiles", force: :cascade do |t|
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "username"
    t.index ["user_id"], name: "index_user_profiles_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", null: false
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "failed_login_attempts", default: 0, null: false
    t.boolean "is_locked", default: false, null: false
    t.string "role"
    t.string "provider"
    t.string "uid"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "password_resets", "users"
  add_foreign_key "platform_connections", "users"
  add_foreign_key "user_avatars", "user_profiles"
  add_foreign_key "user_name_change_logs", "user_profiles"
  add_foreign_key "user_profiles", "users"
end
