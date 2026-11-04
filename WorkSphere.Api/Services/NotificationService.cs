
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using WorkSphere.Api.Data;
using WorkSphere.Api.Models;

namespace WorkSphere.Api.Services;

public class NotificationService
{
    private readonly AppDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;

    public NotificationService(
        AppDbContext context,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task CreateForUserAsync(
        string userId,
        string title,
        string message,
        string type = "General",
        string? link = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            Link = link,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
    }

    public async Task CreateForRolesAsync(
        IEnumerable<string> roles,
        string title,
        string message,
        string type = "General",
        string? link = null)
    {
        var userIds = new HashSet<string>();

        foreach (var role in roles)
        {
            var users = await _userManager.GetUsersInRoleAsync(role);

            foreach (var user in users)
            {
                userIds.Add(user.Id);
            }
        }

        if (userIds.Count == 0)
            return;

        var notifications = userIds.Select(userId => new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            Link = link,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();
    }
}
