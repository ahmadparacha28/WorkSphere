
using System.ComponentModel.DataAnnotations;

namespace WorkSphere.Api.DTOs
{
    public class TaskStatusUpdateDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
