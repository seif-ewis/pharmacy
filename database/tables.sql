schema is : 
"addresses"	"id"	"uuid"
"addresses"	"user_id"	"uuid"
"addresses"	"label"	"character varying"
"addresses"	"city"	"character varying"
"addresses"	"street"	"character varying"
"addresses"	"details"	"text"
"addresses"	"is_default"	"boolean"
"ai_generation_logs"	"id"	"uuid"
"ai_generation_logs"	"medicine_id"	"uuid"
"ai_generation_logs"	"generated_by"	"uuid"
"ai_generation_logs"	"generated_data"	"jsonb"
"ai_generation_logs"	"created_at"	"timestamp without time zone"
"audit_logs"	"id"	"uuid"
"audit_logs"	"user_id"	"uuid"
"audit_logs"	"action"	"text"
"audit_logs"	"entity"	"character varying"
"audit_logs"	"entity_id"	"uuid"
"audit_logs"	"timestamp"	"timestamp without time zone"
"chats"	"id"	"uuid"
"chats"	"patient_id"	"uuid"
"chats"	"pharmacist_id"	"uuid"
"chats"	"status"	"character varying"
"chats"	"created_at"	"timestamp without time zone"
"chats"	"last_message_at"	"timestamp without time zone"
"medicines"	"id"	"uuid"
"medicines"	"name"	"character varying"
"medicines"	"description"	"text"
"medicines"	"benefits"	"text"
"medicines"	"side_effects"	"text"
"medicines"	"image_url"	"text"
"medicines"	"reviewed_by"	"uuid"
"medicines"	"reviewed_at"	"timestamp without time zone"
"medicines"	"quantity"	"integer"
"medicines"	"low_stock_threshold"	"integer"
"medicines"	"created_at"	"timestamp without time zone"
"medicines"	"price"	"numeric"
"medicines"	"category"	"character varying"
"medicines"	"icon"	"character varying"
"messages"	"id"	"uuid"
"messages"	"chat_id"	"uuid"
"messages"	"sender_id"	"uuid"
"messages"	"message"	"text"
"messages"	"type"	"character varying"
"messages"	"created_at"	"timestamp without time zone"
"messages"	"read"	"boolean"
"notifications"	"id"	"uuid"
"notifications"	"title"	"character varying"
"notifications"	"message"	"text"
"notifications"	"type"	"character varying"
"notifications"	"created_at"	"timestamp without time zone"
"order_items"	"id"	"uuid"
"order_items"	"order_id"	"uuid"
"order_items"	"medicine_id"	"uuid"
"order_items"	"quantity"	"integer"
"order_items"	"price"	"numeric"
"orders"	"id"	"uuid"
"orders"	"order_uid"	"character varying"
"orders"	"user_id"	"uuid"
"orders"	"processed_by"	"uuid"
"orders"	"address_id"	"uuid"
"orders"	"phone"	"character varying"
"orders"	"order_type"	"character varying"
"orders"	"scheduled_for"	"timestamp without time zone"
"orders"	"status"	"character varying"
"orders"	"total_price"	"numeric"
"orders"	"created_at"	"timestamp without time zone"
"orders"	"subtotal"	"numeric"
"orders"	"delivery_fee"	"numeric"
"orders"	"discount_total"	"numeric"
"orders"	"promotion_id"	"uuid"
"orders"	"tax_amount"	"numeric"
"orders"	"invoice_url"	"text"
"orders"	"payment_status"	"character varying"
"payments"	"id"	"uuid"
"payments"	"order_id"	"uuid"
"payments"	"user_id"	"uuid"
"payments"	"amount"	"numeric"
"payments"	"payment_method"	"character varying"
"payments"	"status"	"character varying"
"payments"	"created_at"	"timestamp without time zone"
"pharmacy_settings"	"id"	"uuid"
"pharmacy_settings"	"tax_rate"	"numeric"
"pharmacy_settings"	"delivery_fee"	"numeric"
"pharmacy_settings"	"modified_by"	"uuid"
"pharmacy_settings"	"created_at"	"timestamp without time zone"
"pharmacy_status_logs"	"id"	"uuid"
"pharmacy_status_logs"	"is_open"	"boolean"
"pharmacy_status_logs"	"created_by"	"uuid"
"pharmacy_status_logs"	"created_at"	"timestamp without time zone"
"prescription_ai_results"	"id"	"uuid"
"prescription_ai_results"	"prescription_id"	"uuid"
"prescription_ai_results"	"raw_text"	"text"
"prescription_ai_results"	"suggested_meds"	"jsonb"
"prescription_ai_results"	"confidence_score"	"numeric"
"prescription_ai_results"	"created_at"	"timestamp without time zone"
"prescription_final"	"id"	"uuid"
"prescription_final"	"prescription_id"	"uuid"
"prescription_final"	"approved_by"	"uuid"
"prescription_final"	"final_meds"	"jsonb"
"prescription_final"	"notes"	"text"
"prescription_final"	"approved_at"	"timestamp without time zone"
"prescriptions"	"id"	"uuid"
"prescriptions"	"user_id"	"uuid"
"prescriptions"	"image_url"	"text"
"prescriptions"	"status"	"character varying"
"prescriptions"	"created_at"	"timestamp without time zone"
"promotion_usage"	"id"	"uuid"
"promotion_usage"	"promotion_id"	"uuid"
"promotion_usage"	"user_id"	"uuid"
"promotion_usage"	"order_id"	"uuid"
"promotion_usage"	"discount_applied"	"numeric"
"promotion_usage"	"used_at"	"timestamp without time zone"
"promotions"	"id"	"uuid"
"promotions"	"code"	"character varying"
"promotions"	"label"	"character varying"
"promotions"	"description"	"text"
"promotions"	"discount_type"	"character varying"
"promotions"	"discount_value"	"numeric"
"promotions"	"min_order_amount"	"numeric"
"promotions"	"min_quantity"	"integer"
"promotions"	"max_discount_amount"	"numeric"
"promotions"	"start_date"	"timestamp without time zone"
"promotions"	"end_date"	"timestamp without time zone"
"promotions"	"is_active"	"boolean"
"promotions"	"usage_limit_global"	"integer"
"promotions"	"usage_limit_per_user"	"integer"
"promotions"	"created_at"	"timestamp without time zone"
"promotions"	"is_public"	"boolean"
"user_notifications"	"id"	"uuid"
"user_notifications"	"user_id"	"uuid"
"user_notifications"	"notification_id"	"uuid"
"user_notifications"	"read"	"boolean"
"user_notifications"	"sent_at"	"timestamp without time zone"
"users"	"created_at"	"timestamp without time zone"
"product_requests"	"id"	"uuid"
"product_requests"	"user_id"	"uuid"
"product_requests"	"product_name"	"character varying"
"product_requests"	"description"	"text"
"product_requests"	"status"	"character varying"
"product_requests"	"matched_medicine_id"	"uuid"
"product_requests"	"doctor_notes"	"text"
"product_requests"	"created_at"	"timestamp without time zone"
"availability_notifications"	"id"	"uuid"
"availability_notifications"	"user_id"	"uuid"
"availability_notifications"	"medicine_id"	"uuid"
"availability_notifications"	"is_sent"	"boolean"
"availability_notifications"	"created_at"	"timestamp without time zone"
"inventory_adjustments"	"id"	"uuid"
"inventory_adjustments"	"medicine_id"	"uuid"
"inventory_adjustments"	"adjustment_type"	"character varying"
"inventory_adjustments"	"quantity_change"	"integer"
"inventory_adjustments"	"reference_id"	"uuid"
"inventory_adjustments"	"performed_by"	"uuid"
"inventory_adjustments"	"reason"	"text"
"inventory_adjustments"	"created_at"	"timestamp without time zone"
"return_items"	"id"	"uuid"
"return_items"	"return_id"	"uuid"
"return_items"	"medicine_id"	"uuid"
"return_items"	"quantity"	"integer"
"return_items"	"condition"	"character varying"
"returns"	"id"	"uuid"
"returns"	"order_id"	"uuid"
"returns"	"user_id"	"uuid"
"returns"	"status"	"character varying"
"returns"	"refund_amount"	"numeric"
"returns"	"reason"	"text"
"returns"	"admin_notes"	"text"
"returns"	"created_at"	"timestamp without time zone"
"returns"	"updated_at"	"timestamp without time zone"

// indexxx


"addresses"	"idx_fk_addresses_user"	"CREATE INDEX idx_fk_addresses_user ON pu,blic.addresses USING btree (user_id)",
"addresses"	"addresses_pkey"	"CREATE UNIQUE INDEX addresses_pkey ON public.ad,dresses USING btree (id)",
"ai_generation_logs"	"ai_generation_logs_pkey"	"CREATE UNIQUE INDEX ai_genera,tion_logs_pkey ON public.ai_generation_logs USING btree (id)",
"audit_logs"	"audit_logs_pkey"	"CREATE UNIQUE INDEX audit_logs_pkey ON public,.audit_logs USING btree (id)",
"chats"	"idx_chats_participants"	"CREATE INDEX idx_chats_participants ON publ,ic.chats USING btree (patient_id, pharmacist_id)",
"chats"	"chats_pkey"	"CREATE UNIQUE INDEX chats_pkey ON public.chats USING bt,ree (id)",
"medicines"	"medicines_pkey"	"CREATE UNIQUE INDEX medicines_pkey ON public.me,dicines USING btree (id)",
"medicines"	"idx_medicines_name_search"	"CREATE INDEX idx_medicines_name_sear,ch ON public.medicines USING btree (name text_pattern_ops)",
"messages"	"idx_messages_chat_time"	"CREATE INDEX idx_messages_chat_time ON p,ublic.messages USING btree (chat_id, created_at)",
"messages"	"messages_pkey"	"CREATE UNIQUE INDEX messages_pkey ON public.messa,ges USING btree (id)",
"notifications"	"notifications_pkey"	"CREATE UNIQUE INDEX notifications_pkey ,ON public.notifications USING btree (id)",
"order_items"	"order_items_pkey"	"CREATE UNIQUE INDEX order_items_pkey ON pub,lic.order_items USING btree (id)",
"order_items"	"idx_fk_order_items_medicine"	"CREATE INDEX idx_fk_order_items_,medicine ON public.order_items USING btree (medicine_id)",
"order_items"	"idx_fk_order_items_order"	"CREATE INDEX idx_fk_order_items_ord,er ON public.order_items USING btree (order_id)",
"orders"	"idx_fk_orders_promotion"	"CREATE INDEX idx_fk_orders_promotion ON p,ublic.orders USING btree (promotion_id)",
"orders"	"orders_order_uid_key"	"CREATE UNIQUE INDEX orders_order_uid_key ON ,public.orders USING btree (order_uid)",
"orders"	"orders_pkey"	"CREATE UNIQUE INDEX orders_pkey ON public.orders USIN,G btree (id)",
"orders"	"idx_fk_orders_address"	"CREATE INDEX idx_fk_orders_address ON publi,c.orders USING btree (address_id)",
"orders"	"idx_orders_user_date"	"CREATE INDEX idx_orders_user_date ON public.,orders USING btree (user_id, created_at DESC)",
"orders"	"idx_orders_status"	"CREATE INDEX idx_orders_status ON public.orders, USING btree (status)",
"payments"	"payments_pkey"	"CREATE UNIQUE INDEX payments_pkey ON public.payme,nts USING btree (id)",
"payments"	"idx_payments_order"	"CREATE INDEX idx_payments_order ON public.pa,yments USING btree (order_id)",
"pharmacy_settings"	"pharmacy_settings_pkey"	"CREATE UNIQUE INDEX pharmacy_se,ttings_pkey ON public.pharmacy_settings USING btree (id)",
"prescription_ai_results"	"idx_fk_ai_results_prescription"	"CREATE INDEX idx_,fk_ai_results_prescription ON public.prescription_ai_results USING btree (prescription_id)",
"prescription_ai_results"	"prescription_ai_results_pkey"	"CREATE UNIQUE INDEX, prescription_ai_results_pkey ON public.prescription_ai_results USING btree (id)",
"prescription_final"	"prescription_final_pkey"	"CREATE UNIQUE INDEX prescript,ion_final_pkey ON public.prescription_final USING btree (id)",
"prescription_final"	"idx_fk_final_prescription"	"CREATE INDEX idx_fk_final_p,rescription ON public.prescription_final USING btree (prescription_id)",
"prescriptions"	"idx_fk_prescriptions_user"	"CREATE INDEX idx_fk_prescription,s_user ON public.prescriptions USING btree (user_id)",
"prescriptions"	"prescriptions_pkey"	"CREATE UNIQUE INDEX prescriptions_pkey ,ON public.prescriptions USING btree (id)",
"prescriptions"	"idx_prescriptions_status"	"CREATE INDEX idx_prescriptions_st,atus ON public.prescriptions USING btree (status)",
"promotion_usage"	"idx_promotion_usage_check"	"CREATE INDEX idx_promotion_usa,ge_check ON public.promotion_usage USING btree (user_id, promotion_id)",
"promotion_usage"	"promotion_usage_pkey"	"CREATE UNIQUE INDEX promotion_usage,_pkey ON public.promotion_usage USING btree (id)",
"promotions"	"promotions_code_key"	"CREATE UNIQUE INDEX promotions_code_key O,N public.promotions USING btree (code)",
"promotions"	"promotions_pkey"	"CREATE UNIQUE INDEX promotions_pkey ON public,.promotions USING btree (id)",
"promotions"	"idx_promotions_code"	"CREATE INDEX idx_promotions_code ON publi,c.promotions USING btree (code)",
"user_notifications"	"user_notifications_pkey"	"CREATE UNIQUE INDEX user_noti,fications_pkey ON public.user_notifications USING btree (id)",
"user_notifications"	"idx_fk_user_notif_user"	"CREATE INDEX idx_fk_user_notif,_user ON public.user_notifications USING btree (user_id)",
"users"	"users_pkey"	"CREATE UNIQUE INDEX users_pkey ON public.users USING bt,ree (id)",
"users"	"users_email_key"	"CREATE UNIQUE INDEX users_email_key ON public.user,s USING btree (email)",
"users"	"idx_users_phone"	"CREATE INDEX idx_users_phone ON public.users USING, btree (phone)",
