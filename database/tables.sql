schema is : 
"addresses"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"addresses"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"addresses"	"label"	"character varying"	"YES"	
"addresses"	"city"	"character varying"	"YES"	
"addresses"	"street"	"character varying"	"YES"	
"addresses"	"details"	"text"	"YES"	
"addresses"	"is_default"	"boolean"	"YES"	
"ai_generation_logs"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"ai_generation_logs"	"medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"ai_generation_logs"	"generated_by"	"uuid"	"YES"	"FOREIGN KEY"
"ai_generation_logs"	"generated_data"	"jsonb"	"YES"	
"ai_generation_logs"	"created_at"	"timestamp without time zone"	"YES"	
"audit_logs"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"audit_logs"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"audit_logs"	"action"	"text"	"YES"	
"audit_logs"	"entity"	"character varying"	"YES"	
"audit_logs"	"entity_id"	"uuid"	"YES"	
"audit_logs"	"timestamp"	"timestamp without time zone"	"YES"	
"availability_notifications"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"availability_notifications"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"availability_notifications"	"medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"availability_notifications"	"is_sent"	"boolean"	"YES"	
"availability_notifications"	"created_at"	"timestamp without time zone"	"YES"	
"chats"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"chats"	"patient_id"	"uuid"	"YES"	"FOREIGN KEY"
"chats"	"pharmacist_id"	"uuid"	"YES"	"FOREIGN KEY"
"chats"	"status"	"character varying"	"YES"	
"chats"	"created_at"	"timestamp without time zone"	"YES"	
"chats"	"last_message_at"	"timestamp without time zone"	"YES"	
"inventory_adjustments"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"inventory_adjustments"	"medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"inventory_adjustments"	"adjustment_type"	"character varying"	"NO"	
"inventory_adjustments"	"quantity_change"	"integer"	"NO"	
"inventory_adjustments"	"reference_id"	"uuid"	"YES"	
"inventory_adjustments"	"performed_by"	"uuid"	"YES"	"FOREIGN KEY"
"inventory_adjustments"	"reason"	"text"	"YES"	
"inventory_adjustments"	"created_at"	"timestamp without time zone"	"YES"	
"medicines"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"medicines"	"name"	"character varying"	"NO"	
"medicines"	"description"	"text"	"YES"	
"medicines"	"benefits"	"text"	"YES"	
"medicines"	"side_effects"	"text"	"YES"	
"medicines"	"image_url"	"text"	"YES"	
"medicines"	"reviewed_by"	"uuid"	"YES"	"FOREIGN KEY"
"medicines"	"reviewed_at"	"timestamp without time zone"	"YES"	
"medicines"	"quantity"	"integer"	"YES"	
"medicines"	"low_stock_threshold"	"integer"	"YES"	
"medicines"	"created_at"	"timestamp without time zone"	"YES"	
"medicines"	"price"	"numeric"	"YES"	
"medicines"	"category"	"character varying"	"YES"	
"medicines"	"icon"	"character varying"	"YES"	
"medicines"	"original_price"	"numeric"	"YES"	
"messages"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"messages"	"chat_id"	"uuid"	"YES"	"FOREIGN KEY"
"messages"	"sender_id"	"uuid"	"YES"	"FOREIGN KEY"
"messages"	"message"	"text"	"YES"	
"messages"	"type"	"character varying"	"YES"	
"messages"	"created_at"	"timestamp without time zone"	"YES"	
"messages"	"read"	"boolean"	"YES"	
"notifications"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"notifications"	"title"	"character varying"	"YES"	
"notifications"	"message"	"text"	"YES"	
"notifications"	"type"	"character varying"	"YES"	
"notifications"	"created_at"	"timestamp without time zone"	"YES"	
"notifications"	"sender_id"	"uuid"	"YES"	"FOREIGN KEY"
"notifications"	"scope"	"character varying"	"YES"	
"order_items"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"order_items"	"order_id"	"uuid"	"YES"	"FOREIGN KEY"
"order_items"	"medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"order_items"	"quantity"	"integer"	"NO"	
"order_items"	"price"	"numeric"	"NO"	
"order_status_logs"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"order_status_logs"	"order_id"	"uuid"	"NO"	"FOREIGN KEY"
"order_status_logs"	"old_status"	"character varying"	"YES"	
"order_status_logs"	"new_status"	"character varying"	"NO"	
"order_status_logs"	"changed_by"	"uuid"	"NO"	"FOREIGN KEY"
"order_status_logs"	"changed_at"	"timestamp without time zone"	"NO"	
"orders"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"orders"	"order_uid"	"character varying"	"NO"	"UNIQUE"
"orders"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"orders"	"processed_by"	"uuid"	"YES"	"FOREIGN KEY"
"orders"	"address_id"	"uuid"	"YES"	"FOREIGN KEY"
"orders"	"phone"	"character varying"	"YES"	
"orders"	"order_type"	"character varying"	"YES"	
"orders"	"scheduled_for"	"timestamp without time zone"	"YES"	
"orders"	"status"	"character varying"	"YES"	
"orders"	"total_price"	"numeric"	"YES"	
"orders"	"created_at"	"timestamp without time zone"	"YES"	
"orders"	"subtotal"	"numeric"	"YES"	
"orders"	"delivery_fee"	"numeric"	"YES"	
"orders"	"discount_total"	"numeric"	"YES"	
"orders"	"promotion_id"	"uuid"	"YES"	"FOREIGN KEY"
"orders"	"tax_amount"	"numeric"	"YES"	
"orders"	"invoice_url"	"text"	"YES"	
"orders"	"payment_status"	"character varying"	"YES"	
"orders"	"shift_id"	"uuid"	"YES"	"FOREIGN KEY"
"payments"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"payments"	"order_id"	"uuid"	"YES"	"FOREIGN KEY"
"payments"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"payments"	"amount"	"numeric"	"NO"	
"payments"	"payment_method"	"character varying"	"NO"	
"payments"	"status"	"character varying"	"YES"	
"payments"	"created_at"	"timestamp without time zone"	"YES"	
"payments"	"shift_id"	"uuid"	"YES"	"FOREIGN KEY"
"pharmacy_settings"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"pharmacy_settings"	"tax_rate"	"numeric"	"YES"	
"pharmacy_settings"	"delivery_fee"	"numeric"	"YES"	
"pharmacy_settings"	"created_at"	"timestamp without time zone"	"YES"	
"pharmacy_settings"	"modified_by"	"uuid"	"YES"	
"pharmacy_status_logs"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"pharmacy_status_logs"	"is_open"	"boolean"	"YES"	
"pharmacy_status_logs"	"created_by"	"uuid"	"YES"	
"pharmacy_status_logs"	"created_at"	"timestamp without time zone"	"YES"	
"prescription_ai_results"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"prescription_ai_results"	"prescription_id"	"uuid"	"YES"	"FOREIGN KEY"
"prescription_ai_results"	"raw_text"	"text"	"YES"	
"prescription_ai_results"	"suggested_meds"	"jsonb"	"YES"	
"prescription_ai_results"	"confidence_score"	"numeric"	"YES"	
"prescription_ai_results"	"created_at"	"timestamp without time zone"	"YES"	
"prescription_final"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"prescription_final"	"prescription_id"	"uuid"	"YES"	"FOREIGN KEY"
"prescription_final"	"approved_by"	"uuid"	"YES"	"FOREIGN KEY"
"prescription_final"	"final_meds"	"jsonb"	"YES"	
"prescription_final"	"notes"	"text"	"YES"	
"prescription_final"	"approved_at"	"timestamp without time zone"	"YES"	
"prescriptions"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"prescriptions"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"prescriptions"	"image_url"	"text"	"YES"	
"prescriptions"	"status"	"character varying"	"YES"	
"prescriptions"	"created_at"	"timestamp without time zone"	"YES"	
"product_requests"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"product_requests"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"product_requests"	"product_name"	"character varying"	"NO"	
"product_requests"	"description"	"text"	"YES"	
"product_requests"	"status"	"character varying"	"YES"	
"product_requests"	"matched_medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"product_requests"	"doctor_notes"	"text"	"YES"	
"product_requests"	"created_at"	"timestamp without time zone"	"YES"	
"promotion_usage"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"promotion_usage"	"promotion_id"	"uuid"	"YES"	"FOREIGN KEY"
"promotion_usage"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"promotion_usage"	"order_id"	"uuid"	"YES"	"FOREIGN KEY"
"promotion_usage"	"discount_applied"	"numeric"	"YES"	
"promotion_usage"	"used_at"	"timestamp without time zone"	"YES"	
"promotions"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"promotions"	"code"	"character varying"	"YES"	"UNIQUE"
"promotions"	"label"	"character varying"	"YES"	
"promotions"	"description"	"text"	"YES"	
"promotions"	"discount_type"	"character varying"	"NO"	
"promotions"	"discount_value"	"numeric"	"YES"	
"promotions"	"min_order_amount"	"numeric"	"YES"	
"promotions"	"min_quantity"	"integer"	"YES"	
"promotions"	"max_discount_amount"	"numeric"	"YES"	
"promotions"	"start_date"	"timestamp without time zone"	"YES"	
"promotions"	"end_date"	"timestamp without time zone"	"YES"	
"promotions"	"is_active"	"boolean"	"YES"	
"promotions"	"usage_limit_global"	"integer"	"YES"	
"promotions"	"usage_limit_per_user"	"integer"	"YES"	
"promotions"	"created_at"	"timestamp without time zone"	"YES"	
"promotions"	"is_public"	"boolean"	"YES"	
"return_items"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"return_items"	"return_id"	"uuid"	"YES"	"FOREIGN KEY"
"return_items"	"medicine_id"	"uuid"	"YES"	"FOREIGN KEY"
"return_items"	"quantity"	"integer"	"NO"	
"return_items"	"condition"	"character varying"	"YES"	
"returns"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"returns"	"order_id"	"uuid"	"YES"	"FOREIGN KEY"
"returns"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"returns"	"status"	"character varying"	"YES"	
"returns"	"refund_amount"	"numeric"	"YES"	
"returns"	"reason"	"text"	"YES"	
"returns"	"admin_notes"	"text"	"YES"	
"returns"	"created_at"	"timestamp without time zone"	"YES"	
"returns"	"updated_at"	"timestamp without time zone"	"YES"	
"returns"	"shift_id"	"uuid"	"YES"	"FOREIGN KEY"
"roles"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"roles"	"name"	"character varying"	"NO"	"UNIQUE"
"roles"	"description"	"text"	"YES"	
"roles"	"created_at"	"timestamp without time zone"	"YES"	
"shifts"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"shifts"	"opened_by"	"uuid"	"NO"	"FOREIGN KEY"
"shifts"	"closed_by"	"uuid"	"YES"	"FOREIGN KEY"
"shifts"	"opened_at"	"timestamp without time zone"	"NO"	
"shifts"	"closed_at"	"timestamp without time zone"	"YES"	
"shifts"	"total_orders"	"integer"	"YES"	
"shifts"	"total_prescriptions"	"integer"	"YES"	
"shifts"	"total_returns"	"integer"	"YES"	
"shifts"	"gross_revenue"	"numeric"	"YES"	
"shifts"	"net_revenue"	"numeric"	"YES"	
"shifts"	"status"	"character varying"	"YES"	
"user_notifications"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"user_notifications"	"user_id"	"uuid"	"YES"	"FOREIGN KEY"
"user_notifications"	"notification_id"	"uuid"	"YES"	"FOREIGN KEY"
"user_notifications"	"read"	"boolean"	"YES"	
"user_notifications"	"sent_at"	"timestamp without time zone"	"YES"	
"user_roles"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"user_roles"	"user_id"	"uuid"	"NO"	"UNIQUE"
"user_roles"	"user_id"	"uuid"	"NO"	"FOREIGN KEY"
"user_roles"	"role_id"	"uuid"	"NO"	"UNIQUE"
"user_roles"	"role_id"	"uuid"	"NO"	"FOREIGN KEY"
"user_roles"	"assigned_at"	"timestamp without time zone"	"YES"	
"users"	"id"	"uuid"	"NO"	"PRIMARY KEY"
"users"	"full_name"	"character varying"	"NO"	
"users"	"email"	"character varying"	"NO"	"UNIQUE"
"users"	"password_hash"	"text"	"NO"	
"users"	"phone"	"character varying"	"YES"	
"users"	"role"	"character varying"	"NO"	
"users"	"created_at"	"timestamp without time zone"	"YES"	
"users"	"avatar"	"text"	"YES"	

// indexxx

"addresses"	"addresses_pkey"	"id"	true	true
"addresses"	"idx_fk_addresses_user"	"user_id"	false	false
"ai_generation_logs"	"ai_generation_logs_pkey"	"id"	true	true
"audit_logs"	"audit_logs_pkey"	"id"	true	true
"availability_notifications"	"availability_notifications_pkey"	"id"	true	true
"chats"	"chats_pkey"	"id"	true	true
"chats"	"idx_chats_participants"	"patient_id"	false	false
"chats"	"idx_chats_participants"	"pharmacist_id"	false	false
"inventory_adjustments"	"inventory_adjustments_pkey"	"id"	true	true
"medicines"	"idx_medicines_name_search"	"name"	false	false
"medicines"	"medicines_pkey"	"id"	true	true
"messages"	"idx_messages_chat_time"	"created_at"	false	false
"messages"	"idx_messages_chat_time"	"chat_id"	false	false
"messages"	"messages_pkey"	"id"	true	true
"notifications"	"idx_notifications_scope"	"scope"	false	false
"notifications"	"idx_notifications_sender"	"sender_id"	false	false
"notifications"	"notifications_pkey"	"id"	true	true
"order_items"	"idx_fk_order_items_medicine"	"medicine_id"	false	false
"order_items"	"idx_fk_order_items_order"	"order_id"	false	false
"order_items"	"order_items_pkey"	"id"	true	true
"order_status_logs"	"idx_order_status_logs_date"	"changed_at"	false	false
"order_status_logs"	"idx_order_status_logs_order"	"order_id"	false	false
"order_status_logs"	"order_status_logs_pkey"	"id"	true	true
"orders"	"idx_fk_orders_address"	"address_id"	false	false
"orders"	"idx_fk_orders_promotion"	"promotion_id"	false	false
"orders"	"idx_orders_shift"	"shift_id"	false	false
"orders"	"idx_orders_status"	"status"	false	false
"orders"	"idx_orders_user_date"	"created_at"	false	false
"orders"	"idx_orders_user_date"	"user_id"	false	false
"orders"	"orders_order_uid_key"	"order_uid"	true	false
"orders"	"orders_pkey"	"id"	true	true
"payments"	"idx_payments_order"	"order_id"	false	false
"payments"	"idx_payments_shift"	"shift_id"	false	false
"payments"	"payments_pkey"	"id"	true	true
"pg_aggregate"	"pg_aggregate_fnoid_index"	"aggfnoid"	true	true
"pg_am"	"pg_am_name_index"	"amname"	true	false
"pg_am"	"pg_am_oid_index"	"oid"	true	true
"pg_amop"	"pg_amop_fam_strat_index"	"amoprighttype"	true	false
"pg_amop"	"pg_amop_fam_strat_index"	"amopfamily"	true	false
"pg_amop"	"pg_amop_fam_strat_index"	"amoplefttype"	true	false
"pg_amop"	"pg_amop_fam_strat_index"	"amopstrategy"	true	false
"pg_amop"	"pg_amop_oid_index"	"oid"	true	true
"pg_amop"	"pg_amop_opr_fam_index"	"amopopr"	true	false
"pg_amop"	"pg_amop_opr_fam_index"	"amoppurpose"	true	false
"pg_amop"	"pg_amop_opr_fam_index"	"amopfamily"	true	false
"pg_amproc"	"pg_amproc_fam_proc_index"	"amproclefttype"	true	false
"pg_amproc"	"pg_amproc_fam_proc_index"	"amprocfamily"	true	false
"pg_amproc"	"pg_amproc_fam_proc_index"	"amprocnum"	true	false
"pg_amproc"	"pg_amproc_fam_proc_index"	"amprocrighttype"	true	false
"pg_amproc"	"pg_amproc_oid_index"	"oid"	true	true
"pg_attrdef"	"pg_attrdef_adrelid_adnum_index"	"adrelid"	true	false
"pg_attrdef"	"pg_attrdef_adrelid_adnum_index"	"adnum"	true	false
"pg_attrdef"	"pg_attrdef_oid_index"	"oid"	true	true
"pg_attribute"	"pg_attribute_relid_attnam_index"	"attname"	true	false
"pg_attribute"	"pg_attribute_relid_attnam_index"	"attrelid"	true	false
"pg_attribute"	"pg_attribute_relid_attnum_index"	"attnum"	true	true
"pg_attribute"	"pg_attribute_relid_attnum_index"	"attrelid"	true	true
"pg_auth_members"	"pg_auth_members_grantor_index"	"grantor"	false	false
"pg_auth_members"	"pg_auth_members_member_role_index"	"roleid"	true	false
"pg_auth_members"	"pg_auth_members_member_role_index"	"member"	true	false
"pg_auth_members"	"pg_auth_members_member_role_index"	"grantor"	true	false
"pg_auth_members"	"pg_auth_members_oid_index"	"oid"	true	true
"pg_auth_members"	"pg_auth_members_role_member_index"	"roleid"	true	false
"pg_auth_members"	"pg_auth_members_role_member_index"	"grantor"	true	false
"pg_auth_members"	"pg_auth_members_role_member_index"	"member"	true	false
"pg_authid"	"pg_authid_oid_index"	"oid"	true	true
"pg_authid"	"pg_authid_rolname_index"	"rolname"	true	false
"pg_cast"	"pg_cast_oid_index"	"oid"	true	true
"pg_cast"	"pg_cast_source_target_index"	"casttarget"	true	false
"pg_cast"	"pg_cast_source_target_index"	"castsource"	true	false
"pg_class"	"pg_class_oid_index"	"oid"	true	true
"pg_class"	"pg_class_relname_nsp_index"	"relname"	true	false
"pg_class"	"pg_class_relname_nsp_index"	"relnamespace"	true	false
"pg_class"	"pg_class_tblspc_relfilenode_index"	"relfilenode"	false	false
"pg_class"	"pg_class_tblspc_relfilenode_index"	"reltablespace"	false	false
"pg_collation"	"pg_collation_name_enc_nsp_index"	"collencoding"	true	false
"pg_collation"	"pg_collation_name_enc_nsp_index"	"collname"	true	false
"pg_collation"	"pg_collation_name_enc_nsp_index"	"collnamespace"	true	false
"pg_collation"	"pg_collation_oid_index"	"oid"	true	true
"pg_constraint"	"pg_constraint_conname_nsp_index"	"conname"	false	false
"pg_constraint"	"pg_constraint_conname_nsp_index"	"connamespace"	false	false
"pg_constraint"	"pg_constraint_conparentid_index"	"conparentid"	false	false
"pg_constraint"	"pg_constraint_conrelid_contypid_conname_index"	"contypid"	true	false
"pg_constraint"	"pg_constraint_conrelid_contypid_conname_index"	"conname"	true	false
"pg_constraint"	"pg_constraint_conrelid_contypid_conname_index"	"conrelid"	true	false
"pg_constraint"	"pg_constraint_contypid_index"	"contypid"	false	false
"pg_constraint"	"pg_constraint_oid_index"	"oid"	true	true
"pg_conversion"	"pg_conversion_default_index"	"contoencoding"	true	false
"pg_conversion"	"pg_conversion_default_index"	"conforencoding"	true	false
"pg_conversion"	"pg_conversion_default_index"	"connamespace"	true	false
"pg_conversion"	"pg_conversion_default_index"	"oid"	true	false
"pg_conversion"	"pg_conversion_name_nsp_index"	"connamespace"	true	false
"pg_conversion"	"pg_conversion_name_nsp_index"	"conname"	true	false
"pg_conversion"	"pg_conversion_oid_index"	"oid"	true	true
"pg_database"	"pg_database_datname_index"	"datname"	true	false
"pg_database"	"pg_database_oid_index"	"oid"	true	true
"pg_db_role_setting"	"pg_db_role_setting_databaseid_rol_index"	"setrole"	true	true
"pg_db_role_setting"	"pg_db_role_setting_databaseid_rol_index"	"setdatabase"	true	true
"pg_default_acl"	"pg_default_acl_oid_index"	"oid"	true	true
"pg_default_acl"	"pg_default_acl_role_nsp_obj_index"	"defaclobjtype"	true	false
"pg_default_acl"	"pg_default_acl_role_nsp_obj_index"	"defaclnamespace"	true	false
"pg_default_acl"	"pg_default_acl_role_nsp_obj_index"	"defaclrole"	true	false
"pg_depend"	"pg_depend_depender_index"	"objid"	false	false
"pg_depend"	"pg_depend_depender_index"	"classid"	false	false
"pg_depend"	"pg_depend_depender_index"	"objsubid"	false	false
"pg_depend"	"pg_depend_reference_index"	"refobjsubid"	false	false
"pg_depend"	"pg_depend_reference_index"	"refobjid"	false	false
"pg_depend"	"pg_depend_reference_index"	"refclassid"	false	false
"pg_description"	"pg_description_o_c_o_index"	"objoid"	true	true
"pg_description"	"pg_description_o_c_o_index"	"classoid"	true	true
"pg_description"	"pg_description_o_c_o_index"	"objsubid"	true	true
"pg_enum"	"pg_enum_oid_index"	"oid"	true	true
"pg_enum"	"pg_enum_typid_label_index"	"enumlabel"	true	false
"pg_enum"	"pg_enum_typid_label_index"	"enumtypid"	true	false
"pg_enum"	"pg_enum_typid_sortorder_index"	"enumtypid"	true	false
"pg_enum"	"pg_enum_typid_sortorder_index"	"enumsortorder"	true	false
"pg_event_trigger"	"pg_event_trigger_evtname_index"	"evtname"	true	false
"pg_event_trigger"	"pg_event_trigger_oid_index"	"oid"	true	true
"pg_extension"	"pg_extension_name_index"	"extname"	true	false
"pg_extension"	"pg_extension_oid_index"	"oid"	true	true
"pg_foreign_data_wrapper"	"pg_foreign_data_wrapper_name_index"	"fdwname"	true	false
"pg_foreign_data_wrapper"	"pg_foreign_data_wrapper_oid_index"	"oid"	true	true
"pg_foreign_server"	"pg_foreign_server_name_index"	"srvname"	true	false
"pg_foreign_server"	"pg_foreign_server_oid_index"	"oid"	true	true
"pg_foreign_table"	"pg_foreign_table_relid_index"	"ftrelid"	true	true
"pg_index"	"pg_index_indexrelid_index"	"indexrelid"	true	true
"pg_index"	"pg_index_indrelid_index"	"indrelid"	false	false
"pg_inherits"	"pg_inherits_parent_index"	"inhparent"	false	false
"pg_inherits"	"pg_inherits_relid_seqno_index"	"inhrelid"	true	true
"pg_inherits"	"pg_inherits_relid_seqno_index"	"inhseqno"	true	true
"pg_init_privs"	"pg_init_privs_o_c_o_index"	"classoid"	true	true
"pg_init_privs"	"pg_init_privs_o_c_o_index"	"objoid"	true	true
"pg_init_privs"	"pg_init_privs_o_c_o_index"	"objsubid"	true	true
"pg_language"	"pg_language_name_index"	"lanname"	true	false
"pg_language"	"pg_language_oid_index"	"oid"	true	true
"pg_largeobject"	"pg_largeobject_loid_pn_index"	"loid"	true	true
"pg_largeobject"	"pg_largeobject_loid_pn_index"	"pageno"	true	true
"pg_largeobject_metadata"	"pg_largeobject_metadata_oid_index"	"oid"	true	true
"pg_namespace"	"pg_namespace_nspname_index"	"nspname"	true	false
"pg_namespace"	"pg_namespace_oid_index"	"oid"	true	true
"pg_opclass"	"pg_opclass_am_name_nsp_index"	"opcname"	true	false
"pg_opclass"	"pg_opclass_am_name_nsp_index"	"opcmethod"	true	false
"pg_opclass"	"pg_opclass_am_name_nsp_index"	"opcnamespace"	true	false
"pg_opclass"	"pg_opclass_oid_index"	"oid"	true	true
"pg_operator"	"pg_operator_oid_index"	"oid"	true	true
"pg_operator"	"pg_operator_oprname_l_r_n_index"	"oprname"	true	false
"pg_operator"	"pg_operator_oprname_l_r_n_index"	"oprright"	true	false
"pg_operator"	"pg_operator_oprname_l_r_n_index"	"oprnamespace"	true	false
"pg_operator"	"pg_operator_oprname_l_r_n_index"	"oprleft"	true	false
"pg_opfamily"	"pg_opfamily_am_name_nsp_index"	"opfmethod"	true	false
"pg_opfamily"	"pg_opfamily_am_name_nsp_index"	"opfnamespace"	true	false
"pg_opfamily"	"pg_opfamily_am_name_nsp_index"	"opfname"	true	false
"pg_opfamily"	"pg_opfamily_oid_index"	"oid"	true	true
"pg_parameter_acl"	"pg_parameter_acl_oid_index"	"oid"	true	true
"pg_parameter_acl"	"pg_parameter_acl_parname_index"	"parname"	true	false
"pg_partitioned_table"	"pg_partitioned_table_partrelid_index"	"partrelid"	true	true
"pg_policy"	"pg_policy_oid_index"	"oid"	true	true
"pg_policy"	"pg_policy_polrelid_polname_index"	"polrelid"	true	false
"pg_policy"	"pg_policy_polrelid_polname_index"	"polname"	true	false
"pg_proc"	"pg_proc_oid_index"	"oid"	true	true
"pg_proc"	"pg_proc_proname_args_nsp_index"	"proargtypes"	true	false
"pg_proc"	"pg_proc_proname_args_nsp_index"	"pronamespace"	true	false
"pg_proc"	"pg_proc_proname_args_nsp_index"	"proname"	true	false
"pg_publication"	"pg_publication_oid_index"	"oid"	true	true
"pg_publication"	"pg_publication_pubname_index"	"pubname"	true	false
"pg_publication_namespace"	"pg_publication_namespace_oid_index"	"oid"	true	true
"pg_publication_namespace"	"pg_publication_namespace_pnnspid_pnpubid_index"	"pnnspid"	true	false
"pg_publication_namespace"	"pg_publication_namespace_pnnspid_pnpubid_index"	"pnpubid"	true	false
"pg_publication_rel"	"pg_publication_rel_oid_index"	"oid"	true	true
"pg_publication_rel"	"pg_publication_rel_prpubid_index"	"prpubid"	false	false
"pg_publication_rel"	"pg_publication_rel_prrelid_prpubid_index"	"prpubid"	true	false
"pg_publication_rel"	"pg_publication_rel_prrelid_prpubid_index"	"prrelid"	true	false
"pg_range"	"pg_range_rngmultitypid_index"	"rngmultitypid"	true	false
"pg_range"	"pg_range_rngtypid_index"	"rngtypid"	true	true
"pg_replication_origin"	"pg_replication_origin_roiident_index"	"roident"	true	true
"pg_replication_origin"	"pg_replication_origin_roname_index"	"roname"	true	false
"pg_rewrite"	"pg_rewrite_oid_index"	"oid"	true	true
"pg_rewrite"	"pg_rewrite_rel_rulename_index"	"rulename"	true	false
"pg_rewrite"	"pg_rewrite_rel_rulename_index"	"ev_class"	true	false
"pg_seclabel"	"pg_seclabel_object_index"	"objoid"	true	true
"pg_seclabel"	"pg_seclabel_object_index"	"provider"	true	true
"pg_seclabel"	"pg_seclabel_object_index"	"classoid"	true	true
"pg_seclabel"	"pg_seclabel_object_index"	"objsubid"	true	true
"pg_sequence"	"pg_sequence_seqrelid_index"	"seqrelid"	true	true
"pg_shdepend"	"pg_shdepend_depender_index"	"objid"	false	false
"pg_shdepend"	"pg_shdepend_depender_index"	"objsubid"	false	false
"pg_shdepend"	"pg_shdepend_depender_index"	"classid"	false	false
"pg_shdepend"	"pg_shdepend_depender_index"	"dbid"	false	false
"pg_shdepend"	"pg_shdepend_reference_index"	"refobjid"	false	false
"pg_shdepend"	"pg_shdepend_reference_index"	"refclassid"	false	false
"pg_shdescription"	"pg_shdescription_o_c_index"	"classoid"	true	true
"pg_shdescription"	"pg_shdescription_o_c_index"	"objoid"	true	true
"pg_shseclabel"	"pg_shseclabel_object_index"	"provider"	true	true
"pg_shseclabel"	"pg_shseclabel_object_index"	"classoid"	true	true
"pg_shseclabel"	"pg_shseclabel_object_index"	"objoid"	true	true
"pg_statistic"	"pg_statistic_relid_att_inh_index"	"stainherit"	true	true
"pg_statistic"	"pg_statistic_relid_att_inh_index"	"staattnum"	true	true
"pg_statistic"	"pg_statistic_relid_att_inh_index"	"starelid"	true	true
"pg_statistic_ext"	"pg_statistic_ext_name_index"	"stxnamespace"	true	false
"pg_statistic_ext"	"pg_statistic_ext_name_index"	"stxname"	true	false
"pg_statistic_ext"	"pg_statistic_ext_oid_index"	"oid"	true	true
"pg_statistic_ext"	"pg_statistic_ext_relid_index"	"stxrelid"	false	false
"pg_statistic_ext_data"	"pg_statistic_ext_data_stxoid_inh_index"	"stxdinherit"	true	true
"pg_statistic_ext_data"	"pg_statistic_ext_data_stxoid_inh_index"	"stxoid"	true	true
"pg_subscription"	"pg_subscription_oid_index"	"oid"	true	true
"pg_subscription"	"pg_subscription_subname_index"	"subname"	true	false
"pg_subscription"	"pg_subscription_subname_index"	"subdbid"	true	false
"pg_subscription_rel"	"pg_subscription_rel_srrelid_srsubid_index"	"srrelid"	true	true
"pg_subscription_rel"	"pg_subscription_rel_srrelid_srsubid_index"	"srsubid"	true	true
"pg_tablespace"	"pg_tablespace_oid_index"	"oid"	true	true
"pg_tablespace"	"pg_tablespace_spcname_index"	"spcname"	true	false
"pg_transform"	"pg_transform_oid_index"	"oid"	true	true
"pg_transform"	"pg_transform_type_lang_index"	"trftype"	true	false
"pg_transform"	"pg_transform_type_lang_index"	"trflang"	true	false
"pg_trigger"	"pg_trigger_oid_index"	"oid"	true	true
"pg_trigger"	"pg_trigger_tgconstraint_index"	"tgconstraint"	false	false
"pg_trigger"	"pg_trigger_tgrelid_tgname_index"	"tgrelid"	true	false
"pg_trigger"	"pg_trigger_tgrelid_tgname_index"	"tgname"	true	false
"pg_ts_config"	"pg_ts_config_cfgname_index"	"cfgnamespace"	true	false
"pg_ts_config"	"pg_ts_config_cfgname_index"	"cfgname"	true	false
"pg_ts_config"	"pg_ts_config_oid_index"	"oid"	true	true
"pg_ts_config_map"	"pg_ts_config_map_index"	"mapcfg"	true	true
"pg_ts_config_map"	"pg_ts_config_map_index"	"maptokentype"	true	true
"pg_ts_config_map"	"pg_ts_config_map_index"	"mapseqno"	true	true
"pg_ts_dict"	"pg_ts_dict_dictname_index"	"dictnamespace"	true	false
"pg_ts_dict"	"pg_ts_dict_dictname_index"	"dictname"	true	false
"pg_ts_dict"	"pg_ts_dict_oid_index"	"oid"	true	true
"pg_ts_parser"	"pg_ts_parser_oid_index"	"oid"	true	true
"pg_ts_parser"	"pg_ts_parser_prsname_index"	"prsname"	true	false
"pg_ts_parser"	"pg_ts_parser_prsname_index"	"prsnamespace"	true	false
"pg_ts_template"	"pg_ts_template_oid_index"	"oid"	true	true
"pg_ts_template"	"pg_ts_template_tmplname_index"	"tmplnamespace"	true	false
"pg_ts_template"	"pg_ts_template_tmplname_index"	"tmplname"	true	false
"pg_type"	"pg_type_oid_index"	"oid"	true	true
"pg_type"	"pg_type_typname_nsp_index"	"typname"	true	false
"pg_type"	"pg_type_typname_nsp_index"	"typnamespace"	true	false
"pg_user_mapping"	"pg_user_mapping_oid_index"	"oid"	true	true
"pg_user_mapping"	"pg_user_mapping_user_server_index"	"umuser"	true	false
"pg_user_mapping"	"pg_user_mapping_user_server_index"	"umserver"	true	false
"pharmacy_settings"	"pharmacy_settings_pkey"	"id"	true	true
"pharmacy_status_logs"	"pharmacy_status_logs_pkey"	"id"	true	true
"prescription_ai_results"	"idx_fk_ai_results_prescription"	"prescription_id"	false	false
"prescription_ai_results"	"prescription_ai_results_pkey"	"id"	true	true
"prescription_final"	"idx_fk_final_prescription"	"prescription_id"	false	false
"prescription_final"	"prescription_final_pkey"	"id"	true	true
"prescriptions"	"idx_fk_prescriptions_user"	"user_id"	false	false
"prescriptions"	"idx_prescriptions_status"	"status"	false	false
"prescriptions"	"prescriptions_pkey"	"id"	true	true
"product_requests"	"product_requests_pkey"	"id"	true	true
"promotion_usage"	"idx_promotion_usage_check"	"user_id"	false	false
"promotion_usage"	"idx_promotion_usage_check"	"promotion_id"	false	false
"promotion_usage"	"promotion_usage_pkey"	"id"	true	true
"promotions"	"idx_promotions_code"	"code"	false	false
"promotions"	"promotions_code_key"	"code"	true	false
"promotions"	"promotions_pkey"	"id"	true	true
"return_items"	"return_items_pkey"	"id"	true	true
"returns"	"idx_returns_shift"	"shift_id"	false	false
"returns"	"returns_pkey"	"id"	true	true
"roles"	"roles_name_key"	"name"	true	false
"roles"	"roles_pkey"	"id"	true	true
"shifts"	"idx_shifts_opened_by"	"opened_by"	false	false
"shifts"	"idx_shifts_status"	"status"	false	false
"shifts"	"shifts_pkey"	"id"	true	true
"user_notifications"	"idx_fk_user_notif_user"	"user_id"	false	false
"user_notifications"	"user_notifications_pkey"	"id"	true	true
"user_roles"	"idx_user_roles_role"	"role_id"	false	false
"user_roles"	"idx_user_roles_user"	"user_id"	false	false
"user_roles"	"user_roles_pkey"	"id"	true	true
"user_roles"	"user_roles_user_id_role_id_key"	"role_id"	true	false
"user_roles"	"user_roles_user_id_role_id_key"	"user_id"	true	false
"users"	"idx_users_phone"	"phone"	false	false
"users"	"users_email_key"	"email"	true	false
"users"	"users_pkey"	"id"	true	true