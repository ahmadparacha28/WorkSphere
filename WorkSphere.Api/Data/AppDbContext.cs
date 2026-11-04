
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // Employee Management
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Department> Departments { get; set; }

        // Leave Management
        public DbSet<LeaveRequest> LeaveRequests { get; set; }

        // Notifications
        public DbSet<Notification> Notifications { get; set; }

        // Attendance Management
        public DbSet<Attendance> Attendances { get; set; }

        // Payroll Management
        public DbSet<Payroll> Payrolls { get; set; }

        // Performance Management
        public DbSet<PerformanceReviewCycle> PerformanceReviewCycles { get; set; }
        public DbSet<PerformanceReview> PerformanceReviews { get; set; }

        // Recruitment Management
        public DbSet<JobVacancy> JobVacancies { get; set; }
        public DbSet<JobApplication> JobApplications { get; set; }
        public DbSet<JobInterview> JobInterviews { get; set; }

        // Employee Onboarding & Offboarding
        public DbSet<EmployeeOnboarding> EmployeeOnboardings { get; set; }
        public DbSet<OnboardingTask> OnboardingTasks { get; set; }
        public DbSet<EmployeeOffboarding> EmployeeOffboardings { get; set; }
        public DbSet<OffboardingTask> OffboardingTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =========================================
            // APPLICATION USER CONFIGURATION
            // =========================================

            modelBuilder.Entity<ApplicationUser>()
                .HasOne<Employee>()
                .WithOne()
                .HasForeignKey<ApplicationUser>(u => u.EmployeeId);

            modelBuilder.Entity<ApplicationUser>()
                .HasIndex(u => u.EmployeeId)
                .IsUnique();

            // =========================================
            // NOTIFICATION CONFIGURATION
            // =========================================

            modelBuilder.Entity<Notification>()
                .HasIndex(n => new { n.UserId, n.IsRead });

            modelBuilder.Entity<Notification>()
                .HasIndex(n => n.CreatedAt);

            // =========================================
            // ATTENDANCE CONFIGURATION
            // =========================================

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.EmployeeId, a.Date })
                .IsUnique();

            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Employee)
                .WithMany()
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // =========================================
            // PAYROLL CONFIGURATION
            // =========================================

            modelBuilder.Entity<Payroll>()
                .HasIndex(p => new
                {
                    p.EmployeeId,
                    p.Month,
                    p.Year
                })
                .IsUnique();

            modelBuilder.Entity<Payroll>()
                .HasOne(p => p.Employee)
                .WithMany()
                .HasForeignKey(p => p.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.BasicSalary)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.Allowances)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.Bonus)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.Overtime)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.TaxDeduction)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.OtherDeductions)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.GrossSalary)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.TotalDeductions)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Payroll>()
                .Property(p => p.NetSalary)
                .HasPrecision(18, 2);

            // =========================================
            // PERFORMANCE MANAGEMENT CONFIGURATION
            // =========================================

            modelBuilder.Entity<PerformanceReview>()
                .HasIndex(r => new
                {
                    r.EmployeeId,
                    r.PerformanceReviewCycleId
                })
                .IsUnique();

            modelBuilder.Entity<PerformanceReview>()
                .Property(r => r.OverallRating)
                .HasPrecision(4, 2);

            modelBuilder.Entity<PerformanceReview>()
                .HasOne(r => r.Employee)
                .WithMany()
                .HasForeignKey(r => r.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PerformanceReview>()
                .HasOne(r => r.PerformanceReviewCycle)
                .WithMany(c => c.Reviews)
                .HasForeignKey(r => r.PerformanceReviewCycleId)
                .OnDelete(DeleteBehavior.Restrict);

            // =========================================
            // RECRUITMENT MANAGEMENT CONFIGURATION
            // =========================================

            modelBuilder.Entity<JobApplication>()
                .HasOne(a => a.JobVacancy)
                .WithMany(v => v.Applications)
                .HasForeignKey(a => a.JobVacancyId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<JobInterview>()
                .HasOne(i => i.JobApplication)
                .WithMany(a => a.Interviews)
                .HasForeignKey(i => i.JobApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

                // =========================================
            // ONBOARDING CONFIGURATION
            // =========================================

            modelBuilder.Entity<EmployeeOnboarding>()
                .HasOne(o => o.Employee)
                .WithMany()
                .HasForeignKey(o => o.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EmployeeOnboarding>()
                .HasIndex(o => o.EmployeeId);

            modelBuilder.Entity<OnboardingTask>()
                .HasOne(t => t.EmployeeOnboarding)
                .WithMany(o => o.Tasks)
                .HasForeignKey(t => t.EmployeeOnboardingId)
                .OnDelete(DeleteBehavior.Cascade);

            // =========================================
            // OFFBOARDING CONFIGURATION
            // =========================================

            modelBuilder.Entity<EmployeeOffboarding>()
                .HasOne(o => o.Employee)
                .WithMany()
                .HasForeignKey(o => o.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EmployeeOffboarding>()
                .HasIndex(o => o.EmployeeId);

            modelBuilder.Entity<OffboardingTask>()
                .HasOne(t => t.EmployeeOffboarding)
                .WithMany(o => o.Tasks)
                .HasForeignKey(t => t.EmployeeOffboardingId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
