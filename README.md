# 💬 ChatApplication

> .NET ve Angular ile geliştirilmiş, Clean Architecture prensiplerine sadık gerçek zamanlı mesajlaşma uygulaması.

[![Canlı Demo](https://img.shields.io/badge/Canlı_Demo-Visit_Site-2ea44f?style=for-the-badge&logo=netlify)](https://astounding-truffle-b0aa2f.netlify.app)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)

---

##  Ekran Görüntüleri

| **Genel Sohbet Arayüzü** | **AI Chatbot Entegrasyonu** | **Profil Düzenleme** |
|:---:|:---:|:---:|
| ![Genel Sohbet](https://github.com/user-attachments/assets/7471708a-51d9-4baf-b920-a5cb5846dae3) | ![Chatbot](https://github.com/user-attachments/assets/1a70babe-acfd-4517-93e3-2044598cc467) | ![Profil](https://github.com/user-attachments/assets/60ff8263-d45e-425b-952d-e1a51b5d10fb) |


---

##  Proje Hakkında

Bu çalışma, modern web teknolojilerini pekiştirmek ve kurumsal uygulama geliştirme standartlarını deneyimlemek amacıyla geliştirdiğim kişisel bir projedir. 

Geliştirme sürecinde **Clean Architecture** prensiplerini uygulayarak sürdürülebilir, test edilebilir ve gevşek bağımlılıklara sahip bir yapı kurmayı hedefledim. Özellikle katmanlı mimari içerisinde **gerçek zamanlı iletişim (SignalR)** senaryolarını, mimariyi ihlal etmeden çözmek projenin en önemli teknik kazanımlarından biridir.

##  Temel Özellikler

Proje, modern yazılım standartlarına uygun olarak aşağıdaki yeteneklere sahiptir:

* ** Gerçek Zamanlı İletişim**
    SignalR teknolojisi ve WebSocket protokolü kullanılarak geliştirilen kesintisiz anlık mesajlaşma altyapısı.
    
* ** AI Chatbot**
    Kullanıcıların sistem içinde etkileşime geçebileceği entegre chatbot desteği.

* ** Clean Architecture**
    Bağımlılıkları minimize eden 4 katmanlı mimari yapısı:
    * **Domain:** Varlıklar (Entities) ve temel iş kuralları.
    * **Application:** Use-case'ler, arayüzler ve CQRS implementasyonu.
    * **Infrastructure:** Dış servisler ve somut implementasyonlar.
    * **Persistence:** Veritabanı erişimi ve migration işlemleri.

* ** Güvenli Kimlik Doğrulama**
    Microsoft Identity altyapısı üzerine kurgulanmış, **Cookie-based Authentication** ile güvenli oturum yönetimi.

* ** CQRS Pattern**
    **MediatR** kütüphanesi kullanılarak Komut (Command) ve Sorgu (Query) sorumluluklarının ayrıştırılması.

* ** Modern Arayüz**
    **Angular** framework'ü ve **SCSS** kullanılarak tasarlanmış, modüler, responsive ve kullanıcı dostu arayüz.

---

##  Teknoloji Yığını (Tech Stack)

**Backend:**
* .NET Core / .NET 9+
* Entity Framework Core (Code First)
* SignalR (WebSockets)
* MediatR (CQRS)
* FluentValidation
* AutoMapper
* Microsoft Identity

**Frontend:**
* Angular
* TypeScript
* SCSS
* RxJS

---

##  Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz.

### Gereksinimler
* [.NET SDK](https://dotnet.microsoft.com/download)
* [Node.js](https://nodejs.org/)
* SQL Server (veya ConnectionString yapılandırmasına uygun bir veritabanı)

### 1. Backend (API) Kurulumu

```bash
# Repoyu klonlayın
git clone [https://github.com/gokhnesen/ChatApplication.git](https://github.com/gokhnesen/ChatApplication.git)

# API klasörüne gidin
cd ChatApplication/ChatApplicationAPI.API

# Veritabanı bağlantı ayarlarını (appsettings.json) kendi ortamınıza göre düzenleyin.

# Bağımlılıkları yükleyin ve projeyi ayağa kaldırın
dotnet restore
dotnet run
```

### 2. Frontend Kurulumu
```bash
# Yeni bir terminalde Client klasörüne gidin
cd ChatApplication/ChatApplicationClient

# Paketleri yükleyin
npm install

# Uygulamayı başlatın
ng serve
