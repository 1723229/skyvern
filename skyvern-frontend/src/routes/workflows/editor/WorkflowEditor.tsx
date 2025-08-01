import { useMountEffect } from "@/hooks/useMountEffect";
import { useSidebarStore } from "@/store/SidebarStore";
import { useWorkflowHasChangesStore } from "@/store/WorkflowHasChangesStore";
import { ReactFlowProvider } from "@xyflow/react";
import { useParams } from "react-router-dom";
import { useWorkflowQuery } from "../hooks/useWorkflowQuery";
import { FlowRenderer } from "./FlowRenderer";
import { getElements } from "./workflowEditorUtils";
import { LogoMinimized } from "@/components/LogoMinimized";
import { useDebugStore } from "@/store/useDebugStore";
import {
  isDisplayedInWorkflowEditor,
  WorkflowEditorParameterTypes,
  WorkflowParameterTypes,
  WorkflowParameterValueType,
  WorkflowSettings,
} from "../types/workflowTypes";
import { ParametersState } from "./types";
import { useGlobalWorkflowsQuery } from "../hooks/useGlobalWorkflowsQuery";
import { WorkflowDebugOverviewWindow } from "./panels/WorkflowDebugOverviewWindow";
import { cn } from "@/util/utils";

function WorkflowEditor() {
  const debugStore = useDebugStore();
  const { workflowPermanentId } = useParams();
  const setCollapsed = useSidebarStore((state) => {
    return state.setCollapsed;
  });
  const setHasChanges = useWorkflowHasChangesStore(
    (state) => state.setHasChanges,
  );

  const { data: workflow, isLoading } = useWorkflowQuery({
    workflowPermanentId,
  });

  const { data: globalWorkflows, isLoading: isGlobalWorkflowsLoading } =
    useGlobalWorkflowsQuery();

  useMountEffect(() => {
    setCollapsed(true);
    setHasChanges(false);
  });

  if (isLoading || isGlobalWorkflowsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoMinimized />
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  const isGlobalWorkflow = globalWorkflows?.some(
    (globalWorkflow) =>
      globalWorkflow.workflow_permanent_id === workflowPermanentId,
  );

  const settings: WorkflowSettings = {
    persistBrowserSession: workflow.persist_browser_session,
    proxyLocation: workflow.proxy_location,
    webhookCallbackUrl: workflow.webhook_callback_url,
    model: workflow.model,
    maxScreenshotScrolls: workflow.max_screenshot_scrolls,
    extraHttpHeaders: workflow.extra_http_headers
      ? JSON.stringify(workflow.extra_http_headers)
      : null,
  };

  const elements = getElements(
    workflow.workflow_definition.blocks,
    settings,
    !isGlobalWorkflow,
  );

  const getInitialParameters = () => {
    return workflow.workflow_definition.parameters
      .filter((parameter) => isDisplayedInWorkflowEditor(parameter))
      .map((parameter) => {
        if (parameter.parameter_type === WorkflowParameterTypes.Workflow) {
          if (
            parameter.workflow_parameter_type ===
            WorkflowParameterValueType.CredentialId
          ) {
            return {
              key: parameter.key,
              parameterType: WorkflowEditorParameterTypes.Credential,
              credentialId: parameter.default_value as string,
              description: parameter.description,
            };
          }
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.Workflow,
            dataType: parameter.workflow_parameter_type,
            defaultValue: parameter.default_value,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type === WorkflowParameterTypes.Context
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.Context,
            sourceParameterKey: parameter.source.key,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type ===
          WorkflowParameterTypes.Bitwarden_Sensitive_Information
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.Secret,
            collectionId: parameter.bitwarden_collection_id,
            identityKey: parameter.bitwarden_identity_key,
            identityFields: parameter.bitwarden_identity_fields,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type ===
          WorkflowParameterTypes.Bitwarden_Credit_Card_Data
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.CreditCardData,
            collectionId: parameter.bitwarden_collection_id,
            itemId: parameter.bitwarden_item_id,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type === WorkflowParameterTypes.Credential
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.Credential,
            credentialId: parameter.credential_id,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type === WorkflowParameterTypes.OnePassword
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.OnePassword,
            vaultId: parameter.vault_id,
            itemId: parameter.item_id,
            description: parameter.description,
          };
        } else if (
          parameter.parameter_type ===
          WorkflowParameterTypes.Bitwarden_Login_Credential
        ) {
          return {
            key: parameter.key,
            parameterType: WorkflowEditorParameterTypes.Credential,
            collectionId: parameter.bitwarden_collection_id,
            itemId: parameter.bitwarden_item_id,
            urlParameterKey: parameter.url_parameter_key,
            description: parameter.description,
          };
        }
        return undefined;
      })
      .filter(Boolean) as ParametersState;
  };

  return (
    <div className="relative flex h-screen w-full">
      <div
        className={cn("h-full w-full", {
          "w-[43.5rem] border-r border-slate-600": debugStore.isDebugMode,
        })}
      >
        <ReactFlowProvider>
          <FlowRenderer
            initialEdges={elements.edges}
            initialNodes={elements.nodes}
            initialParameters={getInitialParameters()}
            initialTitle={workflow.title}
            workflow={workflow}
          />
        </ReactFlowProvider>
      </div>
      {debugStore.isDebugMode && (
        <div
          className="relative h-full w-full p-6"
          style={{ width: "calc(100% - 43.5rem)" }}
        >
          <WorkflowDebugOverviewWindow />
        </div>
      )}
    </div>
  );
}

export { WorkflowEditor };
