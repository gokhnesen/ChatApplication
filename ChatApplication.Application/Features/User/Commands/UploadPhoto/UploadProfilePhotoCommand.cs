using MediatR;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ChatApplication.Application.Features.User.Commands.UploadPhoto
{
    public class UploadProfilePhotoCommand : IRequest<UploadProfilePhotoCommandResponse>
    {
        public IFormFile? Photo { get; set; }
    }
}
