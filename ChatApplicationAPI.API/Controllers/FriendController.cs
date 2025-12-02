using ChatApplication.Application.Features.Friend.Commands.BlockFriend;
using ChatApplication.Application.Features.Friend.Commands.RemoveFriend;
using ChatApplication.Application.Features.Friend.Commands.RespondToFriendRequest;
using ChatApplication.Application.Features.Friend.Commands.SendFriendRequest;
using ChatApplication.Application.Features.Friend.Commands.UnBlockFriend;
using ChatApplication.Application.Features.Friend.Queries.GetFriends;
using ChatApplication.Application.Features.Friend.Queries.GetPendingRequests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ChatApplicationAPI.API.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FriendController : BaseController
    {
        [HttpPost("send-request")]
        public async Task<IActionResult> SendFriendRequest([FromBody] SendFriendRequestCommand command)
        {
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpPost("respond")]
        public async Task<IActionResult> RespondToFriendRequest([FromBody] RespondToFriendRequestCommand command)
        {
            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpGet("my-friends")]
        public async Task<IActionResult> GetMyFriends([FromQuery] string? userId)
        {
            var query = new GetFriendsQuery { UserId = userId };
            var response = await Mediator.Send(query);
            return Ok(response);
        }

        [HttpGet("pending-requests")]
        public async Task<IActionResult> GetPendingRequests([FromQuery] string? userId)
        {
            var query = new GetPendingRequestsQuery { UserId = userId };
            var response = await Mediator.Send(query);
            return Ok(response);
        }

        [HttpDelete("remove/{friendId}")]
        public async Task<IActionResult> RemoveFriend([FromBody] RemoveFriendCommand command)
        {

            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpPost("block")]
        public async Task<IActionResult> BlockUser([FromBody] BlockFriendOrUserCommand command)
        {

            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }

        [HttpPost("unblock")]
        public async Task<IActionResult> UnblockUser([FromBody] UnBlockFriendOrUserCommand command)
        {

            var response = await Mediator.Send(command);
            return response.IsSuccess ? Ok(response) : BadRequest(response);
        }
    }

}