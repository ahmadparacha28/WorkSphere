using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class JobApplicationStatusDto
    {
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = string.Empty;
    }
}