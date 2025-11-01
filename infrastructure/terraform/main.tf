terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "fraud-classifier-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "fraud-classifier-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "fraud-classifier-igw"
  }
}

# Subnets Públicas (para ALB)
resource "aws_subnet" "public_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  
  map_public_ip_on_launch = true

  tags = {
    Name = "fraud-classifier-public-1a"
  }
}

resource "aws_subnet" "public_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
  
  map_public_ip_on_launch = true

  tags = {
    Name = "fraud-classifier-public-1b"
  }
}

# Subnets Privadas (para ECS e RDS)
resource "aws_subnet" "private_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "fraud-classifier-private-1a"
  }
}

resource "aws_subnet" "private_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "fraud-classifier-private-1b"
  }
}

# Route Table para Subnets Públicas
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "fraud-classifier-public-rt"
  }
}

resource "aws_route_table_association" "public_1a" {
  subnet_id      = aws_subnet.public_1a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_1b" {
  subnet_id      = aws_subnet.public_1b.id
  route_table_id = aws_route_table.public.id
}

# NAT Gateway (para ECS acessar internet)
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "fraud-classifier-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1a.id

  tags = {
    Name = "fraud-classifier-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table para Subnets Privadas
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "fraud-classifier-private-rt"
  }
}

resource "aws_route_table_association" "private_1a" {
  subnet_id      = aws_subnet.private_1a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_1b" {
  subnet_id      = aws_subnet.private_1b.id
  route_table_id = aws_route_table.private.id
}

# Security Group para ALB
resource "aws_security_group" "alb" {
  name        = "fraud-classifier-alb-sg"
  description = "Security group para Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fraud-classifier-alb-sg"
  }
}

# Security Group para ECS
resource "aws_security_group" "ecs" {
  name        = "fraud-classifier-ecs-sg"
  description = "Security group para ECS Fargate tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fraud-classifier-ecs-sg"
  }
}

# Security Group para RDS
resource "aws_security_group" "rds" {
  name        = "fraud-classifier-rds-sg"
  description = "Security group para RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fraud-classifier-rds-sg"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "fraud-classifier-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1a.id, aws_subnet.public_1b.id]

  enable_deletion_protection = false

  tags = {
    Name = "fraud-classifier-alb"
  }
}

# ALB Target Group
resource "aws_lb_target_group" "backend" {
  name        = "fraud-classifier-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "fraud-classifier-tg"
  }
}

# ALB Listener
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  # certificate_arn   = aws_acm_certificate.main.arn  # Descomentar quando tiver certificado SSL

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "fraud-classifier-db-subnet-group"
  subnet_ids = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]

  tags = {
    Name = "fraud-classifier-db-subnet-group"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier             = "fraud-classifier-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.rds_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_type           = "gp3"
  storage_encrypted      = true
  
  db_name  = "frauddb"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  multi_az               = var.environment == "production"
  publicly_accessible    = false
  
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "fraud-classifier-final-snapshot" : null

  tags = {
    Name = "fraud-classifier-db"
  }
}

# ECR Repository
resource "aws_ecr_repository" "backend" {
  name                 = "fraud-classifier-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "fraud-classifier-backend-ecr"
  }
}

# S3 Bucket para Modelos ML
resource "aws_s3_bucket" "ml_models" {
  bucket = "fraud-classifier-ml-models"

  tags = {
    Name = "fraud-classifier-ml-models"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "ml_models" {
  bucket = aws_s3_bucket.ml_models.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Outputs
output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name do Application Load Balancer"
}

output "rds_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Endpoint do RDS PostgreSQL"
  sensitive   = true
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.backend.repository_url
  description = "URL do repositório ECR"
}

