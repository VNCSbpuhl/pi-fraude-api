output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID da VPC"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name do ALB"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "URL do ECR repository"
}

