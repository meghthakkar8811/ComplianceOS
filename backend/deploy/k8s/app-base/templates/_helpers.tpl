{{- define "complianceos.app-base.namespace" -}}
{{- .Values.namespace -}}
{{- end -}}

{{- define "complianceos.app-base.instance" -}}
{{- printf "%s-%s" .Values.service.name (required "tier must be set" .Values.tier) -}}
{{- end -}}

{{- define "complianceos.app-base.labels" -}}
app: complianceos
app.kubernetes.io/name: {{ .Values.service.name }}
app.kubernetes.io/instance: {{ include "complianceos.app-base.instance" . }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- with .Values.labels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{- define "complianceos.app-base.selectorLabels" -}}
app.kubernetes.io/name: {{ .Values.service.name }}
app.kubernetes.io/instance: {{ include "complianceos.app-base.instance" . }}
{{- end -}}

{{/*
Pod template labels only, never spec.selector (which Kubernetes treats as immutable once a
Deployment exists - adding to it breaks every future upgrade). A pod's own labels are free to
carry more than the selector matches on, so app: complianceos lives here instead.
*/}}
{{- define "complianceos.app-base.podLabels" -}}
{{ include "complianceos.app-base.selectorLabels" . }}
app: complianceos
{{- end -}}

{{/*
rollingUpdate is only valid alongside type: RollingUpdate — Kubernetes rejects it set
together with Recreate. A tier overriding just the type (e.g. deploymentStrategy: {type:
Recreate}) would otherwise still carry rollingUpdate through from the base default, since
Helm's values merge is per-key, not a replace. Dropping it here means a tier override
never has to know that or null it out itself.
*/}}
{{- define "complianceos.app-base.deploymentStrategy" -}}
type: {{ .Values.deploymentStrategy.type }}
{{- if eq .Values.deploymentStrategy.type "RollingUpdate" }}
rollingUpdate:
  {{- toYaml .Values.deploymentStrategy.rollingUpdate | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "complianceos.app-base.applicationPropertiesConfigMapName" -}}
{{- printf "%s-application-properties-configmap" (include "complianceos.app-base.instance" .) -}}
{{- end -}}

{{- define "complianceos.app-base.globalPropertiesConfigMapName" -}}
{{- $global := .Values.global | default dict -}}
{{- printf "global-properties-%s-configmap" (required "global.env must be set (-e/--environment)" $global.env) -}}
{{- end -}}

{{- define "complianceos.app-base.image" -}}
{{- $global := .Values.global | default dict -}}
{{- $tag := $global.imageTag | default "latest" -}}
{{- $registry := $global.imageRegistry | default "" -}}
{{- $prefix := ternary (printf "%s/" $registry) "" (ne $registry "") -}}
{{- printf "%scomplianceos/%s:%s" $prefix .Values.service.name $tag -}}
{{- end -}}

{{- define "complianceos.app-base.probes" -}}
readinessProbe:
  httpGet:
    path: {{ .Values.probes.readiness.path }}
    port: quarkus-mgmt
  periodSeconds: {{ .Values.probes.readiness.periodSeconds }}
  failureThreshold: {{ .Values.probes.readiness.failureThreshold }}
  timeoutSeconds: {{ .Values.probes.readiness.timeoutSeconds }}
livenessProbe:
  httpGet:
    path: {{ .Values.probes.liveness.path }}
    port: quarkus-mgmt
  periodSeconds: {{ .Values.probes.liveness.periodSeconds }}
  failureThreshold: {{ .Values.probes.liveness.failureThreshold }}
  timeoutSeconds: {{ .Values.probes.liveness.timeoutSeconds }}
{{- if .Values.probes.startup.enabled }}
startupProbe:
  httpGet:
    path: {{ .Values.probes.startup.path }}
    port: quarkus-mgmt
  periodSeconds: {{ .Values.probes.startup.periodSeconds }}
  failureThreshold: {{ .Values.probes.startup.failureThreshold }}
  timeoutSeconds: {{ .Values.probes.startup.timeoutSeconds }}
{{- end }}
{{- end -}}

{{/*
Pekko clustering is a single switch: setting pekko.cluster turns on the runtime property, the
remoting and management ports, and the pod label peers use to find each other. Every other
Pekko-specific template gates on this, not on pekko.cluster directly, so the enablement check
reads the same way everywhere.
*/}}
{{- define "complianceos.app-base.pekkoEnabled" -}}
{{- if .Values.pekko.cluster }}true{{ end -}}
{{- end -}}

{{/*
Every deployment gets pod get/watch/list RBAC and its service account token.
*/}}
{{- define "complianceos.app-base.rbacRules" -}}
{{- $rules := .Values.rbac.rules | default list -}}
{{- $discovery := dict "apiGroups" (list "") "resources" (list "pods") "verbs" (list "get" "watch" "list") -}}
{{- $rules = concat $rules (list $discovery) -}}
{{- toYaml $rules -}}
{{- end -}}

{{- define "complianceos.app-base.needsRbac" -}}
true{{- end -}}

{{- define "complianceos.app-base.automountToken" -}}
true{{- end -}}

{{/*
The label key pod discovery searches on — its own constant, read by the running pod (see
PEKKO_CLUSTER_LABEL_KEY below) so ActorSystemProvider never has to hardcode a value that only
this chart actually controls.
*/}}
{{- define "complianceos.app-base.pekkoClusterLabelKey" -}}
complianceos.io/pekko-cluster
{{- end -}}

{{/*
Which Pekko cluster this deployment joins. Distinct from service.name — that identifies the
Kubernetes Deployment/Service, this identifies cluster membership, so pod discovery only ever
finds peers meant to be in the same cluster instead of every pekko-enabled service in the
namespace.
*/}}
{{- define "complianceos.app-base.pekkoClusterLabel" -}}
{{- if include "complianceos.app-base.pekkoEnabled" . -}}
{{ include "complianceos.app-base.pekkoClusterLabelKey" . }}: {{ .Values.pekko.cluster | quote }}
{{- end -}}
{{- end -}}
