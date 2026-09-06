-- ============================================================================
-- TaskForge seed data
-- Tool catalog (spec section 11) and automation templates (spec section 39).
-- Risk levels follow the examples in spec section 13: read/list/search/report
-- actions are low, record-mutating actions are medium, anything that leaves
-- the system (external email, outbound webhooks/HTTP writes) is high, and
-- destructive actions are critical.
-- ============================================================================

insert into tool_definitions (name, description, category, input_schema, output_schema, risk_level, required_permissions, is_mock) values
-- Email
('search_emails', 'Search the connected mailbox for messages matching a query.', 'email',
  '{"type":"object","required":["query"],"properties":{"query":{"type":"string"},"folder":{"type":"string"},"limit":{"type":"integer","default":50}}}',
  '{"type":"object","properties":{"emails":{"type":"array"}}}',
  'low', array['email:read'], true),
('read_email', 'Read the full content of a single email by id.', 'email',
  '{"type":"object","required":["email_id"],"properties":{"email_id":{"type":"string"}}}',
  '{"type":"object","properties":{"email":{"type":"object"}}}',
  'low', array['email:read'], true),
('classify_email', 'Classify an email into a business category (e.g. complaint, question, urgent).', 'email',
  '{"type":"object","required":["email_id"],"properties":{"email_id":{"type":"string"}}}',
  '{"type":"object","properties":{"category":{"type":"string"},"urgency":{"type":"string"},"confidence":{"type":"number"}}}',
  'low', array['email:read'], true),
('draft_email', 'Draft a reply without sending it.', 'email',
  '{"type":"object","required":["to","subject","body"],"properties":{"to":{"type":"string"},"subject":{"type":"string"},"body":{"type":"string"}}}',
  '{"type":"object","properties":{"draft_id":{"type":"string"}}}',
  'medium', array['email:draft'], true),
('send_email', 'Send an email to an external recipient.', 'email',
  '{"type":"object","required":["to","subject","body"],"properties":{"to":{"type":"string"},"subject":{"type":"string"},"body":{"type":"string"}}}',
  '{"type":"object","properties":{"message_id":{"type":"string"},"sent_at":{"type":"string"}}}',
  'high', array['email:send'], true),

-- Files
('list_files', 'List files in a folder.', 'files',
  '{"type":"object","properties":{"folder":{"type":"string"}}}',
  '{"type":"object","properties":{"files":{"type":"array"}}}',
  'low', array['files:read'], true),
('read_file', 'Read a file''s metadata and content reference.', 'files',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"}}}',
  '{"type":"object","properties":{"file":{"type":"object"}}}',
  'low', array['files:read'], true),
('move_file', 'Move a file to a different folder.', 'files',
  '{"type":"object","required":["file_id","destination_folder"],"properties":{"file_id":{"type":"string"},"destination_folder":{"type":"string"}}}',
  '{"type":"object","properties":{"file":{"type":"object"}}}',
  'medium', array['files:write'], true),
('rename_file', 'Rename a file.', 'files',
  '{"type":"object","required":["file_id","new_name"],"properties":{"file_id":{"type":"string"},"new_name":{"type":"string"}}}',
  '{"type":"object","properties":{"file":{"type":"object"}}}',
  'medium', array['files:write'], true),
('delete_file', 'Permanently delete a file.', 'files',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"}}}',
  '{"type":"object","properties":{"deleted":{"type":"boolean"}}}',
  'critical', array['files:delete'], true),

-- Documents
('extract_text', 'Extract raw text from a document.', 'documents',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"}}}',
  '{"type":"object","properties":{"text":{"type":"string"}}}',
  'low', array['documents:read'], true),
('extract_document_data', 'Extract structured fields (e.g. invoice number, amount, vendor) from a document.', 'documents',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"},"schema_hint":{"type":"string"}}}',
  '{"type":"object","properties":{"fields":{"type":"object"}}}',
  'low', array['documents:read'], true),
('summarize_document', 'Summarize a document''s content.', 'documents',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"}}}',
  '{"type":"object","properties":{"summary":{"type":"string"}}}',
  'low', array['documents:read'], true),
('classify_document', 'Classify a document by type.', 'documents',
  '{"type":"object","required":["file_id"],"properties":{"file_id":{"type":"string"}}}',
  '{"type":"object","properties":{"document_type":{"type":"string"},"confidence":{"type":"number"}}}',
  'low', array['documents:read'], true),

-- Spreadsheet
('read_spreadsheet', 'Read rows from a spreadsheet.', 'spreadsheet',
  '{"type":"object","required":["sheet_id"],"properties":{"sheet_id":{"type":"string"},"range":{"type":"string"}}}',
  '{"type":"object","properties":{"rows":{"type":"array"}}}',
  'low', array['spreadsheet:read'], true),
('update_spreadsheet', 'Update cells in a spreadsheet.', 'spreadsheet',
  '{"type":"object","required":["sheet_id","range","values"],"properties":{"sheet_id":{"type":"string"},"range":{"type":"string"},"values":{"type":"array"}}}',
  '{"type":"object","properties":{"updated_cells":{"type":"integer"}}}',
  'medium', array['spreadsheet:write'], true),
('append_row', 'Append a row to a spreadsheet.', 'spreadsheet',
  '{"type":"object","required":["sheet_id","row"],"properties":{"sheet_id":{"type":"string"},"row":{"type":"object"}}}',
  '{"type":"object","properties":{"row_number":{"type":"integer"}}}',
  'medium', array['spreadsheet:write'], true),
('generate_report', 'Generate a report document from aggregated data.', 'spreadsheet',
  '{"type":"object","required":["title","data"],"properties":{"title":{"type":"string"},"data":{"type":"object"}}}',
  '{"type":"object","properties":{"report_id":{"type":"string"},"url":{"type":"string"}}}',
  'low', array['reports:write'], true),

-- CRM
('search_customer', 'Search for a customer record.', 'crm',
  '{"type":"object","required":["query"],"properties":{"query":{"type":"string"}}}',
  '{"type":"object","properties":{"customers":{"type":"array"}}}',
  'low', array['crm:read'], true),
('create_lead', 'Create a new lead record.', 'crm',
  '{"type":"object","required":["name","email"],"properties":{"name":{"type":"string"},"email":{"type":"string"},"source":{"type":"string"}}}',
  '{"type":"object","properties":{"lead_id":{"type":"string"}}}',
  'medium', array['crm:write'], true),
('update_customer', 'Update an existing customer record.', 'crm',
  '{"type":"object","required":["customer_id","fields"],"properties":{"customer_id":{"type":"string"},"fields":{"type":"object"}}}',
  '{"type":"object","properties":{"customer":{"type":"object"}}}',
  'medium', array['crm:write'], true),
('create_ticket', 'Create a support ticket.', 'crm',
  '{"type":"object","required":["customer_id","subject","description"],"properties":{"customer_id":{"type":"string"},"subject":{"type":"string"},"description":{"type":"string"},"priority":{"type":"string"}}}',
  '{"type":"object","properties":{"ticket_id":{"type":"string"}}}',
  'medium', array['crm:write'], true),

-- Database
('query_database', 'Run a read-only query against a connected database table.', 'database',
  '{"type":"object","required":["table"],"properties":{"table":{"type":"string"},"filters":{"type":"object"}}}',
  '{"type":"object","properties":{"rows":{"type":"array"}}}',
  'low', array['database:read'], true),
('insert_record', 'Insert a record into a connected database table.', 'database',
  '{"type":"object","required":["table","record"],"properties":{"table":{"type":"string"},"record":{"type":"object"}}}',
  '{"type":"object","properties":{"record_id":{"type":"string"}}}',
  'medium', array['database:write'], true),
('update_record', 'Update a record in a connected database table.', 'database',
  '{"type":"object","required":["table","record_id","fields"],"properties":{"table":{"type":"string"},"record_id":{"type":"string"},"fields":{"type":"object"}}}',
  '{"type":"object","properties":{"record":{"type":"object"}}}',
  'medium', array['database:write'], true),

-- HTTP / API (SSRF-guarded — see agent-service/app/tools/http.py)
('http_get', 'Perform an HTTP GET request to an allow-listed external URL.', 'http',
  '{"type":"object","required":["url"],"properties":{"url":{"type":"string"},"headers":{"type":"object"}}}',
  '{"type":"object","properties":{"status":{"type":"integer"},"body":{"type":"string"}}}',
  'low', array['http:external'], false),
('http_post', 'Perform an HTTP POST request to an allow-listed external URL.', 'http',
  '{"type":"object","required":["url","body"],"properties":{"url":{"type":"string"},"body":{"type":"object"},"headers":{"type":"object"}}}',
  '{"type":"object","properties":{"status":{"type":"integer"},"body":{"type":"string"}}}',
  'high', array['http:external'], false),
('http_put', 'Perform an HTTP PUT request to an allow-listed external URL.', 'http',
  '{"type":"object","required":["url","body"],"properties":{"url":{"type":"string"},"body":{"type":"object"},"headers":{"type":"object"}}}',
  '{"type":"object","properties":{"status":{"type":"integer"},"body":{"type":"string"}}}',
  'high', array['http:external'], false),
('http_patch', 'Perform an HTTP PATCH request to an allow-listed external URL.', 'http',
  '{"type":"object","required":["url","body"],"properties":{"url":{"type":"string"},"body":{"type":"object"},"headers":{"type":"object"}}}',
  '{"type":"object","properties":{"status":{"type":"integer"},"body":{"type":"string"}}}',
  'high', array['http:external'], false),

-- Notifications
('send_notification', 'Send an in-app notification to a user or the whole organization.', 'notification',
  '{"type":"object","required":["title","message"],"properties":{"title":{"type":"string"},"message":{"type":"string"},"user_id":{"type":"string"},"type":{"type":"string"}}}',
  '{"type":"object","properties":{"notification_id":{"type":"string"}}}',
  'low', array['notifications:send'], true),
('send_webhook', 'Send an outbound webhook payload.', 'notification',
  '{"type":"object","required":["url","payload"],"properties":{"url":{"type":"string"},"payload":{"type":"object"}}}',
  '{"type":"object","properties":{"status":{"type":"integer"}}}',
  'medium', array['notifications:send'], true);

-- ---------------------------------------------------------------------------
-- Task templates (spec section 39). The 6 marked is_executable=true ship
-- with a complete default_configuration (objective + ordered steps against
-- real tool_definitions) so "Use Template" creates a runnable task
-- immediately, without requiring the AI planner to be configured. The
-- remaining 9 are cataloged with a description but no executable plan yet.
-- ---------------------------------------------------------------------------

insert into task_templates (name, description, category, icon, natural_language_instruction, default_configuration, is_executable) values

('Email Triage', 'Check new support emails, classify them, create tickets for complaints, and notify about urgent issues.', 'support', 'inbox',
 'Every weekday at 9 AM, check new customer support emails, classify them, create tickets for complaints, and notify me about urgent issues.',
 '{"objective":"Process incoming support emails","trigger":{"type":"schedule","schedule":"weekdays 09:00"},"steps":[
   {"order":1,"name":"Find new emails","action":"search_emails","tool_name":"search_emails","risk_level":"low","configuration":{"query":"is:unread","folder":"support"}},
   {"order":2,"name":"Classify each email","action":"classify_email","tool_name":"classify_email","risk_level":"low","configuration":{}},
   {"order":3,"name":"Create ticket for complaints","action":"create_ticket","tool_name":"create_ticket","risk_level":"medium","configuration":{"condition":"category == complaint"}},
   {"order":4,"name":"Notify on urgent issues","action":"send_notification","tool_name":"send_notification","risk_level":"low","configuration":{"condition":"urgency == urgent"}}
 ],"risk_level":"medium","requires_approval":false,"verification":["confirm_ticket_created"]}'::jsonb,
 true),

('Invoice Processing', 'Extract line-item data from incoming invoice documents and record them for accounting.', 'finance', 'file-text',
 'Every time a new invoice file arrives, extract the vendor, amount and due date, record it, and notify the finance channel.',
 '{"objective":"Extract and record invoice data","trigger":{"type":"schedule","schedule":"hourly"},"steps":[
   {"order":1,"name":"List new invoice files","action":"list_files","tool_name":"list_files","risk_level":"low","configuration":{"folder":"invoices/inbox"}},
   {"order":2,"name":"Extract invoice fields","action":"extract_document_data","tool_name":"extract_document_data","risk_level":"low","configuration":{"schema_hint":"invoice"}},
   {"order":3,"name":"Record invoice","action":"insert_record","tool_name":"insert_record","risk_level":"medium","configuration":{"table":"invoices"},"requires_approval":true},
   {"order":4,"name":"Notify finance","action":"send_notification","tool_name":"send_notification","risk_level":"low","configuration":{}}
 ],"risk_level":"high","requires_approval":true,"verification":["confirm_record_created"]}'::jsonb,
 true),

('Lead Processing', 'Read new leads from a spreadsheet and create them in the CRM.', 'sales', 'users',
 'Every morning, read new rows from the leads spreadsheet, create them as CRM leads, and notify sales.',
 '{"objective":"Process new leads into the CRM","trigger":{"type":"schedule","schedule":"daily 08:00"},"steps":[
   {"order":1,"name":"Read new lead rows","action":"read_spreadsheet","tool_name":"read_spreadsheet","risk_level":"low","configuration":{"sheet_id":"leads-inbox"}},
   {"order":2,"name":"Create CRM lead","action":"create_lead","tool_name":"create_lead","risk_level":"medium","configuration":{}},
   {"order":3,"name":"Notify sales team","action":"send_notification","tool_name":"send_notification","risk_level":"low","configuration":{}}
 ],"risk_level":"medium","requires_approval":false,"verification":["confirm_lead_created"]}'::jsonb,
 true),

('Daily Sales Report', 'Compile the day''s sales data and generate a summary report.', 'reporting', 'bar-chart',
 'Every evening at 6 PM, compile today''s sales data and generate a summary report for management.',
 '{"objective":"Generate the daily sales report","trigger":{"type":"schedule","schedule":"daily 18:00"},"steps":[
   {"order":1,"name":"Query today''s sales","action":"query_database","tool_name":"query_database","risk_level":"low","configuration":{"table":"sales_orders"}},
   {"order":2,"name":"Generate report","action":"generate_report","tool_name":"generate_report","risk_level":"low","configuration":{"title":"Daily Sales Report"}},
   {"order":3,"name":"Notify management","action":"send_notification","tool_name":"send_notification","risk_level":"low","configuration":{}}
 ],"risk_level":"low","requires_approval":false,"verification":["confirm_report_generated"]}'::jsonb,
 true),

('Document Classification', 'Classify newly uploaded documents by type and file them accordingly.', 'operations', 'folder-tree',
 'Every hour, classify newly uploaded documents by type and record the classification.',
 '{"objective":"Classify newly uploaded documents","trigger":{"type":"schedule","schedule":"hourly"},"steps":[
   {"order":1,"name":"List new documents","action":"list_files","tool_name":"list_files","risk_level":"low","configuration":{"folder":"documents/inbox"}},
   {"order":2,"name":"Extract text","action":"extract_text","tool_name":"extract_text","risk_level":"low","configuration":{}},
   {"order":3,"name":"Classify document","action":"classify_document","tool_name":"classify_document","risk_level":"low","configuration":{}},
   {"order":4,"name":"Record classification","action":"update_record","tool_name":"update_record","risk_level":"medium","configuration":{"table":"documents"}}
 ],"risk_level":"low","requires_approval":false,"verification":["confirm_record_updated"]}'::jsonb,
 true),

('File Organization', 'Organize files into folders by type and rename them consistently.', 'operations', 'folder',
 'Every night, organize new files into folders by type and apply a consistent naming convention.',
 '{"objective":"Organize and rename inbox files","trigger":{"type":"schedule","schedule":"daily 23:00"},"steps":[
   {"order":1,"name":"List inbox files","action":"list_files","tool_name":"list_files","risk_level":"low","configuration":{"folder":"inbox"}},
   {"order":2,"name":"Classify file type","action":"classify_document","tool_name":"classify_document","risk_level":"low","configuration":{}},
   {"order":3,"name":"Move to type folder","action":"move_file","tool_name":"move_file","risk_level":"medium","configuration":{}},
   {"order":4,"name":"Apply naming convention","action":"rename_file","tool_name":"rename_file","risk_level":"medium","configuration":{}}
 ],"risk_level":"medium","requires_approval":false,"verification":["confirm_file_moved"]}'::jsonb,
 true),

('CRM Cleanup', 'Find and merge duplicate customer records in the CRM.', 'sales', 'shuffle',
 'Every week, find duplicate customer records in the CRM and flag them for merging.',
 '{"objective":"Flag duplicate CRM records","status":"coming_soon"}'::jsonb, false),

('Customer Support', 'Answer common customer questions automatically and escalate the rest.', 'support', 'headset',
 'Automatically answer common customer questions and escalate anything unclear to a human.',
 '{"objective":"Automate first-line customer support","status":"coming_soon"}'::jsonb, false),

('CV Processing', 'Extract candidate details from submitted CVs into the hiring pipeline.', 'hr', 'user-check',
 'When a new CV is submitted, extract candidate details and add them to the hiring pipeline.',
 '{"objective":"Process incoming CVs","status":"coming_soon"}'::jsonb, false),

('Approval Reminder', 'Remind approvers about pending approvals that are aging.', 'operations', 'bell',
 'Every day, remind approvers about approvals that have been pending for more than 24 hours.',
 '{"objective":"Chase aging approvals","status":"coming_soon"}'::jsonb, false),

('Inventory Monitoring', 'Monitor inventory levels and alert when stock is low.', 'operations', 'package',
 'Every day, check inventory levels and alert the operations team when stock is low.',
 '{"objective":"Monitor stock levels","status":"coming_soon"}'::jsonb, false),

('Data Extraction', 'Extract structured data from a batch of mixed documents.', 'operations', 'scan-text',
 'Extract structured data fields from a batch of uploaded documents.',
 '{"objective":"Bulk structured data extraction","status":"coming_soon"}'::jsonb, false),

('Management Reporting', 'Compile a weekly cross-functional report for leadership.', 'reporting', 'presentation',
 'Every Friday, compile a cross-functional summary report for leadership.',
 '{"objective":"Compile leadership report","status":"coming_soon"}'::jsonb, false),

('Compliance Checklist', 'Run a recurring compliance checklist and log the results.', 'compliance', 'shield-check',
 'Every month, run the compliance checklist against current records and log the results.',
 '{"objective":"Run compliance checklist","status":"coming_soon"}'::jsonb, false),

('Operations Monitoring', 'Monitor operational metrics and alert on anomalies.', 'operations', 'activity',
 'Continuously monitor operational metrics and alert when anomalies are detected.',
 '{"objective":"Monitor operational metrics","status":"coming_soon"}'::jsonb, false);
