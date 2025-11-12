using ChatApplication.Application.Features.Friend.Commands.BlockFriend;
using ChatApplication.Application.Features.Friend.Commands.RemoveFriend;
using ChatApplication.Application.Features.Friend.Commands.RespondToFriendRequest;
using ChatApplication.Application.Features.Friend.Commands.SendFriendRequest;
using ChatApplication.Application.Features.Friend.Queries.GetFriends;
using ChatApplication.Application.Features.Friend.Queries.GetPendingRequests;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ChatApplicationAPI.API.Controllers
{
    
    [Route("api/[controller]")]
    [ApiController]
    public class FriendController : BaseController
    {
        [HttpPost("send-request")]
        public async Task<IActionResult> SendFriendRequest([FromBody] SendFriendRequestCommand command)
        {
            try
            {
                if (command == null)
                {
                    return BadRequest(new SendFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Geçersiz istek.",
                        Errors = new List<string> { "?stek bo?." }
                    });
                }

                var response = await Mediator.Send(command);
                return response.IsSuccess ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new SendFriendRequestResponse
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpPost("respond")]
        public async Task<IActionResult> RespondToFriendRequest([FromBody] RespondToFriendRequestCommand command)
        {
            try
            {
                if (command == null)
                {
                    return BadRequest(new RespondToFriendRequestResponse
                    {
                        IsSuccess = false,
                        Message = "Geçersiz istek.",
                        Errors = new List<string> { "?stek bo?." }
                    });
                }

                var response = await Mediator.Send(command);
                return response.IsSuccess ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new RespondToFriendRequestResponse
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpGet("my-friends")]
        public async Task<IActionResult> GetMyFriends()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        IsSuccess = false,
                        Message = "Kullan?c? giri?i yap?lmam??."
                    });
                }

                var query = new GetFriendsQuery { UserId = userId };
                var response = await Mediator.Send(query);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpGet("pending-requests")]
        public async Task<IActionResult> GetPendingRequests()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        IsSuccess = false,
                        Message = "Kullan?c? giri?i yap?lmam??."
                    });
                }

                var query = new GetPendingRequestsQuery { UserId = userId };
                var response = await Mediator.Send(query);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }
        [HttpDelete("remove/{friendId}")]
        public async Task<IActionResult> RemoveFriend(string friendId)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        IsSuccess = false,
                        Message = "Kullan?c? giri?i yap?lmam??."
                    });
                }

                var command = new RemoveFriendCommand
                {
                    UserId = userId,
                    FriendId = friendId
                };

                var response = await Mediator.Send(command);
                return response.IsSuccess ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }

        [HttpPost("block")]
        public async Task<IActionResult> BlockUser([FromBody] BlockFriendOrUserCommand command)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new
                    {
                        IsSuccess = false,
                        Message = "Kullan?c? giri?i yap?lmam??."
                    });
                }

                command.BlockerId = userId;

                var response = await Mediator.Send(command);
                return response.IsSuccess ? Ok(response) : BadRequest(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "Sunucu hatas? olu?tu.",
                    Errors = new List<string> { ex.Message }
                });
            }
        }
    }

}