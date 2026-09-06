// Hand-written to match supabase/migrations/*.sql exactly.
// Regenerate with `supabase gen types typescript` once the project is
// linked, and keep this file's shape (Row/Insert/Update per table) so
// nothing downstream needs to change.

export type OrgRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type OrgPlan = "free" | "pro" | "enterprise";
export type OrgStatus = "active" | "suspended";
export type AgentStatus = "active" | "inactive" | "archived";
export type TaskStatus = "draft" | "active" | "paused" | "archived";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type TriggerType = "manual" | "schedule" | "webhook" | "event";
export type ExecutionStatus =
  | "DRAFT"
  | "PLANNED"
  | "WAITING_APPROVAL"
  | "QUEUED"
  | "RUNNING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "PAUSED"
  | "CANCELLED"
  | "ESCALATED";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type IntegrationStatus = "connected" | "disconnected" | "error";
export type MemoryScope = "short_term" | "task" | "user" | "organization" | "operational";
export type VerificationStatusEnum = "pending" | "passed" | "failed" | "skipped";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, RequiredInsertKeys extends keyof Row, Rel extends Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: Rel;
};

export interface Database {
  public: {
    Tables: {
      organizations: Table<
        {
          id: string;
          name: string;
          slug: string;
          plan: OrgPlan;
          status: OrgStatus;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        },
        "name" | "slug"
      >;
      organization_members: Table<
        {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          created_at: string;
        },
        "organization_id" | "user_id",
        [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ]
      >;
      profiles: Table<
        {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        },
        "id"
      >;
      agents: Table<
        {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          system_prompt: string | null;
          model: string;
          status: AgentStatus;
          configuration: Record<string, unknown>;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        "organization_id" | "name"
      >;
      tasks: Table<
        {
          id: string;
          organization_id: string;
          agent_id: string | null;
          name: string;
          description: string | null;
          natural_language_instruction: string;
          status: TaskStatus;
          risk_level: RiskLevel;
          trigger_type: TriggerType;
          schedule: string | null;
          configuration: Record<string, unknown>;
          requires_approval: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          last_run_at: string | null;
          next_run_at: string | null;
        },
        "organization_id" | "name" | "natural_language_instruction",
        [
          {
            foreignKeyName: "tasks_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ]
      >;
      task_steps: Table<
        {
          id: string;
          task_id: string;
          step_order: number;
          name: string;
          description: string | null;
          step_type: string;
          tool_name: string | null;
          configuration: Record<string, unknown>;
          risk_level: RiskLevel;
          requires_approval: boolean;
          verification_rules: unknown[];
          created_at: string;
        },
        "task_id" | "step_order" | "name",
        [
          {
            foreignKeyName: "task_steps_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ]
      >;
      task_triggers: Table<
        {
          id: string;
          task_id: string;
          organization_id: string;
          trigger_type: TriggerType;
          schedule_expression: string | null;
          timezone: string;
          webhook_secret: string | null;
          event_name: string | null;
          is_active: boolean;
          created_at: string;
        },
        "task_id" | "organization_id" | "trigger_type",
        [
          {
            foreignKeyName: "task_triggers_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ]
      >;
      task_executions: Table<
        {
          id: string;
          task_id: string;
          organization_id: string;
          idempotency_key: string;
          status: ExecutionStatus;
          trigger_source: string;
          started_at: string | null;
          completed_at: string | null;
          duration_ms: number | null;
          input_data: Record<string, unknown>;
          output_data: Record<string, unknown>;
          error: string | null;
          retry_count: number;
          verification_status: VerificationStatusEnum;
          time_saved_seconds: number;
          created_at: string;
          updated_at: string;
        },
        "task_id" | "organization_id" | "idempotency_key",
        [
          {
            foreignKeyName: "task_executions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ]
      >;
      execution_events: Table<
        {
          id: string;
          execution_id: string;
          organization_id: string;
          event_type: string;
          event_data: Record<string, unknown>;
          tool_name: string | null;
          timestamp: string;
          created_at: string;
        },
        "execution_id" | "organization_id" | "event_type",
        [
          {
            foreignKeyName: "execution_events_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "task_executions";
            referencedColumns: ["id"];
          },
        ]
      >;
      tool_definitions: Table<
        {
          id: string;
          name: string;
          description: string;
          category: string;
          input_schema: Record<string, unknown>;
          output_schema: Record<string, unknown>;
          risk_level: RiskLevel;
          required_permissions: string[];
          is_mock: boolean;
          is_active: boolean;
          created_at: string;
        },
        "name" | "description" | "category"
      >;
      tool_permissions: Table<
        {
          id: string;
          organization_id: string;
          tool_name: string;
          min_role: OrgRole;
          is_allowed: boolean;
          created_at: string;
        },
        "organization_id" | "tool_name",
        [
          {
            foreignKeyName: "tool_permissions_tool_name_fkey";
            columns: ["tool_name"];
            isOneToOne: false;
            referencedRelation: "tool_definitions";
            referencedColumns: ["name"];
          },
        ]
      >;
      integrations: Table<
        {
          id: string;
          organization_id: string;
          provider: string;
          name: string;
          status: IntegrationStatus;
          configuration: Record<string, unknown>;
          connected_by: string | null;
          connected_at: string | null;
          created_at: string;
        },
        "organization_id" | "provider" | "name"
      >;
      integration_credentials: Table<
        {
          id: string;
          integration_id: string;
          organization_id: string;
          encrypted_secret: string;
          created_at: string;
        },
        "integration_id" | "organization_id" | "encrypted_secret",
        [
          {
            foreignKeyName: "integration_credentials_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ]
      >;
      approvals: Table<
        {
          id: string;
          organization_id: string;
          execution_id: string;
          step_id: string | null;
          action_description: string;
          risk_level: RiskLevel;
          status: ApprovalStatus;
          requested_by: string;
          decided_by: string | null;
          decision_reason: string | null;
          created_at: string;
          decided_at: string | null;
        },
        "organization_id" | "execution_id" | "action_description" | "risk_level",
        [
          {
            foreignKeyName: "approvals_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "task_executions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approvals_step_id_fkey";
            columns: ["step_id"];
            isOneToOne: false;
            referencedRelation: "task_steps";
            referencedColumns: ["id"];
          },
        ]
      >;
      memories: Table<
        {
          id: string;
          organization_id: string;
          scope: MemoryScope;
          task_id: string | null;
          user_id: string | null;
          key: string;
          value: Record<string, unknown>;
          created_at: string;
          updated_at: string;
          expires_at: string | null;
        },
        "organization_id" | "scope" | "key" | "value",
        [
          {
            foreignKeyName: "memories_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ]
      >;
      notifications: Table<
        {
          id: string;
          organization_id: string;
          user_id: string | null;
          execution_id: string | null;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          idempotency_key: string;
          created_at: string;
        },
        "organization_id" | "type" | "title" | "message" | "idempotency_key",
        [
          {
            foreignKeyName: "notifications_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "task_executions";
            referencedColumns: ["id"];
          },
        ]
      >;
      audit_logs: Table<
        {
          id: string;
          organization_id: string;
          actor_id: string | null;
          actor_type: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        },
        "organization_id" | "action"
      >;
      schedules: Table<
        {
          id: string;
          task_id: string;
          organization_id: string;
          cron_expression: string;
          timezone: string;
          is_active: boolean;
          last_triggered_at: string | null;
          next_trigger_at: string | null;
          created_at: string;
        },
        "task_id" | "organization_id" | "cron_expression",
        [
          {
            foreignKeyName: "schedules_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ]
      >;
      task_templates: Table<
        {
          id: string;
          name: string;
          description: string;
          category: string;
          icon: string;
          natural_language_instruction: string;
          default_configuration: Record<string, unknown>;
          is_executable: boolean;
          created_at: string;
        },
        "name" | "description" | "category" | "natural_language_instruction"
      >;
      agent_metrics: Table<
        {
          id: string;
          organization_id: string;
          agent_id: string | null;
          task_id: string | null;
          execution_id: string | null;
          metric_type: string;
          metric_value: number;
          recorded_at: string;
        },
        "organization_id" | "metric_type" | "metric_value",
        [
          {
            foreignKeyName: "agent_metrics_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_metrics_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agent_metrics_execution_id_fkey";
            columns: ["execution_id"];
            isOneToOne: false;
            referencedRelation: "task_executions";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_organization: {
        Args: { org_name: string; org_slug: string };
        Returns: string;
      };
      is_org_member: {
        Args: { target_org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { target_org_id: string; min_role: OrgRole };
        Returns: boolean;
      };
    };
    Enums: {
      org_role: OrgRole;
      org_plan: OrgPlan;
      org_status: OrgStatus;
      agent_status: AgentStatus;
      task_status: TaskStatus;
      risk_level: RiskLevel;
      trigger_type: TriggerType;
      execution_status: ExecutionStatus;
      approval_status: ApprovalStatus;
      integration_status: IntegrationStatus;
      memory_scope: MemoryScope;
      verification_status: VerificationStatusEnum;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
