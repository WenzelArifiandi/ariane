output "template_id" {
  description = "VMID of the created template"
  value       = var.template_id
}

output "template_name" {
  description = "Name of the created template"
  value       = var.template_name
}

output "template_status" {
  description = "Status message for template creation"
  value       = "Template ${var.template_name} (ID: ${var.template_id}) created successfully"
}