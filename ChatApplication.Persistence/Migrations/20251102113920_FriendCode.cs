using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApplication.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FriendCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FriendCode",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FriendCode",
                table: "AspNetUsers");
        }
    }
}
